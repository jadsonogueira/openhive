import { execFile } from 'child_process';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const YT_DLP = 'yt-dlp';

const PIPED_INSTANCES = [
  'https://piped-api.garudalinux.org',
  'https://api.piped.yt',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.r4fo.com',
];

export interface CaptionResult {
  transcript: string;
  source: string;
}

export interface VideoMetadata {
  title: string;
  uploader: string;
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtube.com')) {
      const vParam = url.searchParams.get('v');
      if (vParam) return vParam;
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
      const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
      if (liveMatch) return liveMatch[1];
      return null;
    }
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null;
    }
  } catch {
    // not a URL
  }
  return null;
}

export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json() as any;
      const title = data.title?.trim();
      const uploader = data.author_name?.trim();
      if (title) return { title, uploader: uploader || '' };
    }
  } catch (err) {
    console.log('[YouTube] oEmbed metadata failed:', (err as Error).message);
  }

  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OpenHive/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json() as any;
      const title = data.title?.trim();
      const uploader = data.uploader?.trim();
      if (title) return { title, uploader: uploader || '' };
    } catch {
      continue;
    }
  }
  return null;
}

export async function tryCaptionsViaPiped(videoId: string): Promise<CaptionResult | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[YouTube] Trying captions via Piped: ${instance}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OpenHive/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json() as any;

      if (data.subtitles && Array.isArray(data.subtitles) && data.subtitles.length > 0) {
        const ptSub = data.subtitles.find(
          (s: any) => s.code === 'pt' || s.code === 'pt-BR' || (s.language && s.language.toLowerCase().includes('portugu'))
        );
        const sub = ptSub || data.subtitles[0];
        if (sub?.url) {
          const captionRes = await fetch(sub.url, { signal: AbortSignal.timeout(10000) });
          if (captionRes.ok) {
            const captionText = await captionRes.text();
            const parsed = parseVTTorSRV3(captionText);
            if (parsed) return { transcript: parsed, source: 'captions-piped' };
          }
        }
      }
      return null;
    } catch {
      continue;
    }
  }
  return null;
}

export async function downloadAudioViaPiped(videoId: string): Promise<Buffer | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[YouTube] Trying audio download via Piped: ${instance}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OpenHive/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) { console.log(`[YouTube] Piped ${instance} returned ${res.status}`); continue; }
      const data = await res.json() as any;
      if (!data.audioStreams?.length) { console.log(`[YouTube] No audio streams on ${instance}`); continue; }

      const sorted = [...data.audioStreams].sort((a: any, b: any) => a.bitrate - b.bitrate);
      const m4aStream = sorted.find((s: any) => s.mimeType?.includes('audio/mp4') || s.format?.includes('M4A'));
      const audioStream = m4aStream || sorted[0];
      if (!audioStream?.url) continue;

      console.log(`[YouTube] Downloading audio: ${audioStream.mimeType}, ${audioStream.bitrate}bps`);
      const audioRes = await fetch(audioStream.url, {
        signal: AbortSignal.timeout(120000),
        headers: { 'User-Agent': 'OpenHive/1.0' },
      });
      if (!audioRes.ok) { console.log(`[YouTube] Audio download failed: ${audioRes.status}`); continue; }
      const arrayBuffer = await audioRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 1000) { console.log(`[YouTube] Audio too small: ${buffer.length}b`); continue; }
      console.log(`[YouTube] Audio downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
      return buffer;
    } catch (err) {
      console.log(`[YouTube] Piped audio from ${instance} failed:`, (err as Error).message);
      continue;
    }
  }
  return null;
}

export async function downloadAudioViaYtDlp(videoId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  const tempDir = join(tmpdir(), 'openhive-yt');
  await mkdir(tempDir, { recursive: true });
  const fileId = randomUUID();
  const tempOutput = join(tempDir, fileId);

  try {
    const nodePath = process.execPath;
    console.log('[YouTube] Trying yt-dlp download for:', videoId, 'node:', nodePath);

    const args = [
      '--no-playlist', '--extract-audio', '--audio-format', 'mp3',
      '--audio-quality', '9', '--output', `${tempOutput}.%(ext)s`,
      '--no-check-certificates', '--no-warnings',
      '--js-runtimes', `node:${nodePath}`,
      `https://www.youtube.com/watch?v=${videoId}`,
    ];

    try {
      await execFileAsync(YT_DLP, args, { timeout: 180000 });
    } catch (err) {
      const errMsg = (err as Error).message || '';
      console.log('[YouTube] yt-dlp error:', errMsg.slice(0, 500));
      if (errMsg.includes('Sign in') || errMsg.includes('bot')) {
        throw new Error('O YouTube bloqueou o acesso do servidor. O video pode estar protegido.');
      }
      console.log('[YouTube] yt-dlp exited with error, checking for output file...');
    }

    const extensions = ['mp3', 'm4a', 'webm', 'opus', 'ogg'];
    for (const ext of extensions) {
      const filePath = `${tempOutput}.${ext}`;
      try {
        const buffer = await readFile(filePath);
        if (buffer.length > 0) return { buffer, filePath };
      } catch { /* file doesn't exist */ }
    }
    return null;
  } catch (err) {
    const extensions = ['mp3', 'm4a', 'webm', 'opus', 'ogg'];
    for (const ext of extensions) {
      try { await unlink(`${tempOutput}.${ext}`); } catch { /* ignore */ }
    }
    const msg = (err as Error).message || '';
    if (msg.includes('bloqueou')) throw err;
    return null;
  }
}

export async function saveTempAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const tempDir = join(tmpdir(), 'openhive-yt');
  await mkdir(tempDir, { recursive: true });
  const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'mp3';
  const filePath = join(tempDir, `${randomUUID()}.${ext}`);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try { await unlink(filePath); } catch { /* ignore */ }
}

function parseVTTorSRV3(raw: string): string | null {
  const lines: string[] = [];

  const vttRegex = /(\d{2}:\d{2}[:.]\d{3})\s*-->\s*\d{2}:\d{2}[:.]\d{3}\s*\n([\s\S]*?)(?=\n\n|\n\d{2}:|$)/g;
  let match;
  while ((match = vttRegex.exec(raw)) !== null) {
    const timestamp = match[1].replace(/\.\d{3}$/, '').replace(/^00:/, '');
    const text = match[2].replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
    if (text) lines.push(`[${timestamp}] ${text}`);
  }
  if (lines.length > 0) return lines.join('\n');

  const xmlRegex = /<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  while ((match = xmlRegex.exec(raw)) !== null) {
    const secs = parseFloat(match[1]);
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ts = `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const text = match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    if (text) lines.push(`[${ts}] ${text}`);
  }

  if (lines.length === 0) {
    const pRegex = /<p\s+t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    while ((match = pRegex.exec(raw)) !== null) {
      const ms = parseInt(match[1], 10);
      const mins = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const ts = `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) lines.push(`[${ts}] ${text}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

export function detectMimeType(filePath: string | null): string {
  if (!filePath) return 'audio/mpeg';
  if (filePath.endsWith('.webm')) return 'audio/webm';
  if (filePath.endsWith('.m4a')) return 'audio/mp4';
  if (filePath.endsWith('.opus') || filePath.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}
