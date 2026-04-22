'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BookOpen, Trash2, ChevronDown, ChevronUp, Loader2, Sparkles, Clock } from 'lucide-react';

type SermonLine = { text: string; timestamp: string };
type Draft = { id: string; title: string; format: string; tone: string; content: string; createdAt: string };
type Sermon = {
  id: string;
  title: string | null;
  lines: SermonLine[];
  status: string;
  createdAt: string;
  _count?: { drafts: number };
  drafts?: Draft[];
};

const TONES = ['Pastoral', 'Jovem', 'Devocional', 'Ensino biblico'];
const FORMATS = ['Carrossel', 'Reels', 'Legenda', 'Frase'];

export default function MeusConteudosPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Sermon>>({});
  const [genTone, setGenTone] = useState(TONES[0]);
  const [genFormat, setGenFormat] = useState(FORMATS[0]);
  const [generating, setGenerating] = useState<string | null>(null);

  async function loadSermons() {
    try {
      const res = await api.listSermons();
      setSermons(res.data || res || []);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { loadSermons(); }, []);

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      try {
        const res = await api.getSermon(id);
        const data = res.data || res;
        setDetails((prev) => ({ ...prev, [id]: data }));
      } catch { /* */ }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta pregacao e todos os rascunhos?')) return;
    try {
      await api.deleteSermon(id);
      setSermons((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar pregacao');
    }
  }

  async function handleDeleteDraft(sermonId: string, draftId: string) {
    try {
      await api.deleteSermonDraft(sermonId, draftId);
      setDetails((prev) => ({
        ...prev,
        [sermonId]: {
          ...prev[sermonId],
          drafts: prev[sermonId].drafts?.filter((d) => d.id !== draftId),
        },
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar rascunho');
    }
  }

  async function handleGenerate(sermonId: string) {
    setGenerating(sermonId);
    try {
      const res = await api.generateSermonContent(sermonId, genTone, genFormat);
      const data = res.data || res;
      setDetails((prev) => ({
        ...prev,
        [sermonId]: { ...prev[sermonId], drafts: data.drafts || [] },
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar');
    }
    setGenerating(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">Meus Conteudos</h1>
          <p className="text-sm text-text-secondary mt-1">Pregacoes salvas e rascunhos gerados</p>
        </div>
      </div>

      {sermons.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-text-muted text-sm">Nenhuma pregacao salva ainda.</p>
          <p className="text-text-muted text-xs mt-1">Va em Pregacao e inicie uma captura ao vivo.</p>
        </div>
      )}

      <div className="space-y-3">
        {sermons.map((sermon) => {
          const isOpen = expanded === sermon.id;
          const detail = details[sermon.id];
          const linesCount = Array.isArray(sermon.lines) ? sermon.lines.length : 0;
          const draftsCount = sermon._count?.drafts || detail?.drafts?.length || 0;

          return (
            <div key={sermon.id} className="card overflow-hidden">
              <div
                className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-bg-card-hover transition-colors"
                onClick={() => toggleExpand(sermon.id)}
              >
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {sermon.title || 'Pregacao sem titulo'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(sermon.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-text-muted">{linesCount} trechos</span>
                    <span className="text-[10px] text-primary font-medium">{draftsCount} rascunhos</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-badge font-semibold ${sermon.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {sermon.status === 'active' ? 'Em andamento' : 'Finalizada'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(sermon.id); }}
                  className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </div>

              {isOpen && (
                <div className="border-t border-border px-5 py-4 space-y-4">
                  {/* Lines */}
                  {detail && Array.isArray(detail.lines) && detail.lines.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase mb-2">Trechos</h4>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {(detail.lines as SermonLine[]).map((line, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-bg-main text-xs">
                            <span className="text-primary font-bold mr-2">{line.timestamp}</span>
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate */}
                  <div className="flex items-end gap-3 pt-2 border-t border-border">
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1">Tom</label>
                      <select value={genTone} onChange={(e) => setGenTone(e.target.value)} className="input-field text-xs py-1.5">
                        {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1">Formato</label>
                      <select value={genFormat} onChange={(e) => setGenFormat(e.target.value)} className="input-field text-xs py-1.5">
                        {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => handleGenerate(sermon.id)}
                      disabled={generating === sermon.id}
                      className="px-3 py-2 rounded-btn text-xs font-semibold bg-primary text-white disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {generating === sermon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Gerar
                    </button>
                  </div>

                  {/* Drafts */}
                  {detail?.drafts && detail.drafts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase mb-2">Rascunhos</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {detail.drafts.map((draft) => (
                          <div key={draft.id} className="px-3 py-3 rounded-lg bg-bg-main border border-border relative group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-primary uppercase">{draft.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-muted">{draft.format} / {draft.tone}</span>
                                <button
                                  onClick={() => handleDeleteDraft(sermon.id, draft.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-text-primary leading-5 whitespace-pre-wrap">{draft.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
