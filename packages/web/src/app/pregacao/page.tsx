'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Mic, MicOff, Plus, Loader2, Sparkles, Clock } from 'lucide-react';

type LiveLine = { id: number; text: string; timestamp: string };
type Draft = { id: string; title: string; format: string; tone: string; content: string };

const TONES = ['Pastoral', 'Jovem', 'Devocional', 'Ensino biblico'];
const FORMATS = ['Carrossel', 'Reels', 'Legenda', 'Frase'];
const SEGMENT_DURATION_MS = 4 * 60 * 1000;

function getClock() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

export default function PregacaoPage() {
  const [isListening, setIsListening] = useState(false);
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [manualEntry, setManualEntry] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sermonId, setSermonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tone, setTone] = useState(TONES[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [genMessage, setGenMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const wantsListeningRef = useRef(false);
  const bufferRef = useRef<string[]>([]);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartRef = useRef(0);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linesRef = useRef<LiveLine[]>([]);

  useEffect(() => { linesRef.current = lines; }, [lines]);

  function addLine(text: string) {
    const normalized = text.trim();
    if (!normalized) return;
    const line: LiveLine = { id: Date.now() + Math.floor(Math.random() * 1000), text: normalized, timestamp: getClock() };
    setLines((prev) => [line, ...prev]);
  }

  const addLineRef = useRef(addLine);
  addLineRef.current = addLine;

  function flushBuffer() {
    const text = bufferRef.current.join(' ').trim();
    bufferRef.current = [];
    if (text) addLineRef.current(text);
  }

  function startSegmentTimer() {
    stopSegmentTimer();
    segmentStartRef.current = Date.now();
    setSecondsLeft(SEGMENT_DURATION_MS / 1000);
    segmentTimerRef.current = setInterval(() => {
      flushBuffer();
      segmentStartRef.current = Date.now();
      setSecondsLeft(SEGMENT_DURATION_MS / 1000);
    }, SEGMENT_DURATION_MS);
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((SEGMENT_DURATION_MS - (Date.now() - segmentStartRef.current)) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
  }

  function stopSegmentTimer() {
    if (segmentTimerRef.current) { clearInterval(segmentTimerRef.current); segmentTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setSecondsLeft(0);
  }

  async function autoSave() {
    if (!sermonId) return;
    const currentLines = linesRef.current;
    if (currentLines.length === 0) return;
    setSaving(true);
    try {
      await api.updateSermon(sermonId, { lines: currentLines });
    } catch { /* silent */ }
    setSaving(false);
  }

  function startAutoSave() {
    stopAutoSave();
    autoSaveRef.current = setInterval(autoSave, 15000);
  }

  function stopAutoSave() {
    if (autoSaveRef.current) { clearInterval(autoSaveRef.current); autoSaveRef.current = null; }
  }

  useEffect(() => {
    return () => { wantsListeningRef.current = false; stopSegmentTimer(); stopAutoSave(); recognitionRef.current?.stop(); };
  }, []);

  async function handleToggleListening() {
    setError(null);
    if (isListening) {
      wantsListeningRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      flushBuffer();
      stopSegmentTimer();
      stopAutoSave();
      setIsListening(false);
      if (sermonId) {
        await api.updateSermon(sermonId, { lines: linesRef.current, status: 'ended' });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError('Permissao de microfone negada.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Navegador nao suporta reconhecimento de voz. Use o Chrome.');
      return;
    }

    // Create sermon in DB
    let sid = sermonId;
    if (!sid) {
      try {
        const res = await api.createSermon(`Pregacao ${new Date().toLocaleDateString('pt-BR')}`);
        sid = res.data?.id || res.id;
        setSermonId(sid);
      } catch { /* continue without DB */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let partialText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += ` ${transcript}`;
        else partialText += ` ${transcript}`;
      }
      setInterimText(partialText.trim());
      if (finalText.trim()) bufferRef.current.push(finalText.trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setError(`Erro: ${event.error}`);
      wantsListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (wantsListeningRef.current) { try { recognition.start(); } catch {} return; }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    wantsListeningRef.current = true;
    setIsListening(true);
    startSegmentTimer();
    if (sid) startAutoSave();
  }

  function handleAddManual() {
    addLine(manualEntry);
    setManualEntry('');
  }

  async function handleGenerate() {
    if (lines.length === 0) { setGenMessage('Nenhum trecho captado.'); return; }
    setGenerating(true);
    setGenMessage('');
    try {
      // Save lines first
      if (sermonId) await api.updateSermon(sermonId, { lines: linesRef.current });
      else {
        const res = await api.createSermon(`Pregacao ${new Date().toLocaleDateString('pt-BR')}`);
        const sid = res.data?.id || res.id;
        setSermonId(sid);
        await api.updateSermon(sid!, { lines: linesRef.current });
      }
      const result = await api.generateSermonContent(sermonId!, tone, format);
      const data = result.data || result;
      setDrafts(data.drafts || []);
      setGenMessage(`${(data.items || data.drafts || []).length} conteudos gerados!`);
    } catch (err: any) {
      setGenMessage(err.message || 'Erro ao gerar');
    }
    setGenerating(false);
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">Pregacao ao Vivo</h1>
          <p className="text-sm text-text-secondary mt-1">Capture trechos do culto e gere conteudo para redes sociais</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left: Capture */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-badge text-xs font-semibold ${isListening ? 'bg-red-100 text-red-700' : 'bg-bg-main text-text-muted'}`}>
                {isListening ? 'Escutando' : 'Em espera'}
              </span>
              {saving && <span className="text-[10px] text-text-muted">Salvando...</span>}
              {isListening && secondsLeft > 0 && (
                <span className="ml-auto text-xs font-mono text-primary flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleToggleListening}
                className={`px-4 py-2.5 rounded-btn text-sm font-semibold text-white flex items-center gap-2 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isListening ? <><MicOff className="w-4 h-4" /> Parar</> : <><Mic className="w-4 h-4" /> Comecar a ouvir</>}
              </button>
            </div>

            {interimText && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {interimText}
              </div>
            )}

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="card p-5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Entrada manual</label>
            <textarea
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              className="input-field resize-none min-h-[100px]"
              placeholder="Digite ou cole um trecho da pregacao..."
            />
            <button
              onClick={handleAddManual}
              disabled={!manualEntry.trim()}
              className="mt-2 px-4 py-2 rounded-btn text-xs font-semibold bg-primary text-white disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar trecho
            </button>
          </div>

          {/* Generate content */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-text-primary mb-3">Gerar Conteudo</h3>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1">Tom</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="input-field text-xs">
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1">Formato</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field text-xs">
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || lines.length === 0}
              className="px-4 py-2.5 rounded-btn text-xs font-semibold bg-gradient-to-r from-primary to-accent-pink text-white disabled:opacity-40 flex items-center gap-2"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar com IA</>}
            </button>
            {genMessage && <p className="mt-2 text-xs text-primary font-medium">{genMessage}</p>}
          </div>
        </div>

        {/* Right: Lines + Drafts */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-text-primary mb-1">Trechos captados</h3>
            <p className="text-[10px] text-text-muted mb-3">{lines.length} trechos</p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lines.length === 0 && (
                <div className="text-center py-8 text-text-muted text-xs">
                  Trechos aparecerao aqui ao captar ou adicionar manualmente.
                </div>
              )}
              {lines.map((line) => (
                <div key={line.id} className="px-3 py-2 rounded-lg bg-bg-main border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-badge">{line.timestamp}</span>
                  </div>
                  <p className="text-xs text-text-primary leading-5">{line.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Generated drafts */}
          {drafts.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-text-primary mb-1">Rascunhos gerados</h3>
              <p className="text-[10px] text-text-muted mb-3">{drafts.length} itens</p>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {drafts.map((draft) => (
                  <div key={draft.id} className="px-3 py-3 rounded-lg bg-bg-main border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-primary uppercase">{draft.title}</span>
                      <span className="text-[10px] text-text-muted">{draft.format} / {draft.tone}</span>
                    </div>
                    <p className="text-xs text-text-primary leading-5 whitespace-pre-wrap">{draft.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
