import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../helpers/resolveOwnerId';
import { prisma } from '../config/database';
import { getSetting } from '../helpers/getSetting';
import { createJob, getJob, updateJob } from '../helpers/jobQueue';

const GEMINI_MODEL = 'gemini-2.5-flash';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const videoUrl: string = req.body?.url || '';
    if (!videoUrl.trim()) {
      res.status(400).json({ success: false, error: 'URL do YouTube invalida.' });
      return;
    }

    const userId = await resolveOwnerId(req.userId!);
    const jobId = randomUUID();
    createJob(jobId);

    processViaGemini(jobId, videoUrl, userId).catch((err) => {
      console.error('[YouTube] Background job failed:', err);
      updateJob(jobId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido.',
      });
    });

    res.json({ success: true, data: { jobId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:jobId', async (req: AuthRequest, res: Response) => {
  const job = getJob(req.params.jobId as string);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job nao encontrado.' });
    return;
  }
  res.json({
    success: true,
    data: {
      status: job.status,
      progress: job.progress,
      transcript: job.transcript,
      source: job.source,
      segments: job.segments,
      error: job.error,
      sermonId: job.sermonId,
    },
  });
});

async function fetchVideoTitle(videoUrl: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = (await res.json()) as any;
      return data.title?.trim() || null;
    }
  } catch {}
  return null;
}

async function saveAsSermon(
  transcript: string,
  videoUrl: string,
  userId: string,
  videoTitle?: string | null,
): Promise<string> {
  const lines = transcript
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const match = line.match(/^\[(\d{1,2}:\d{2})\]\s*(.*)/);
      if (match) return { timestamp: match[1], text: match[2].trim() };
      return { timestamp: '00:00', text: line.trim() };
    })
    .filter((l) => l.text);

  const sermon = await prisma.sermon.create({
    data: {
      userId,
      title: videoTitle || `YouTube: ${videoUrl}`,
      lines,
      status: 'ended',
    },
  });
  return sermon.id;
}

async function processViaGemini(jobId: string, videoUrl: string, userId: string) {
  updateJob(jobId, { status: 'downloading', progress: 'Buscando titulo do video...' });

  const [videoTitle, apiKey] = await Promise.all([
    fetchVideoTitle(videoUrl),
    getSetting('NANO_BANANA_API_KEY'),
  ]);

  if (!apiKey) {
    throw new Error('Chave da API Gemini nao configurada.');
  }

  updateJob(jobId, { status: 'transcribing', progress: 'Transcrevendo com Gemini...' });
  console.log('[YouTube] Starting Gemini transcription for:', videoUrl);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(300000),
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            fileData: {
              mimeType: 'video/*',
              fileUri: videoUrl,
            },
          },
          {
            text: 'Transcreva o audio deste video com timestamps no formato [MM:SS]. Cada linha deve ter o formato "[MM:SS] texto". Apenas a transcricao, sem comentarios ou explicacoes adicionais. Agrupe frases completas em vez de palavras isoladas.',
          },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 65536,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[YouTube] Gemini error:', res.status, errBody.slice(0, 500));
    throw new Error('Falha na transcricao via Gemini. Tente novamente.');
  }

  const data = (await res.json()) as any;
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    const blockReason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
    console.error('[YouTube] Gemini empty response. Reason:', blockReason, JSON.stringify(data).slice(0, 500));
    throw new Error('Gemini nao retornou transcricao.');
  }

  console.log('[YouTube] Gemini raw length:', rawText.length, 'first 200:', rawText.slice(0, 200));

  const lines = rawText.split('\n').filter((l: string) => l.trim());
  const timestamped = lines.filter((l: string) => /^\[?\d{1,2}:\d{2}\]?\s/.test(l.trim()));

  const transcript = (timestamped.length > 5 ? timestamped : lines)
    .map((l: string) => {
      const m = l.trim().match(/^(\[?\d{1,2}:\d{2}\]?)\s*(.*)/);
      if (m) {
        const ts = m[1].startsWith('[') ? m[1] : `[${m[1]}]`;
        return `${ts} ${m[2].trim()}`;
      }
      return l.trim();
    })
    .filter((l: string) => l.replace(/^\[\d{1,2}:\d{2}\]\s*/, '').trim().length > 0)
    .join('\n');

  if (!transcript) {
    throw new Error('Transcricao vazia. O video pode nao conter audio.');
  }

  console.log('[YouTube] Gemini transcription done, segments:', transcript.split('\n').length);

  let sermonId: string | null = null;
  try {
    updateJob(jobId, { progress: 'Salvando pregacao...' });
    const title = videoTitle || `YouTube: ${videoUrl}`;
    sermonId = await saveAsSermon(transcript, videoUrl, userId, title);
  } catch (e) {
    console.error('[YouTube] Failed to save sermon:', e);
  }

  updateJob(jobId, {
    status: 'done',
    progress: 'Transcricao concluida!',
    transcript,
    source: 'Transcricao via Gemini',
    segments: transcript.split('\n').length,
    sermonId,
  });
}

export default router;
