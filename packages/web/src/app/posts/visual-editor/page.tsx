'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  Plus, Trash2, Save, Loader2, Image as ImageIcon, Type, Palette,
  ChevronLeft, Sparkles, Layers, Wand2, Upload, Download,
} from 'lucide-react';

type AspectRatio = '1:1' | '4:5' | '9:16';

interface SlideState {
  id: string;
  // Background
  backgroundUrl: string;
  backgroundPrompt: string; // last prompt used to generate
  // Title
  title: string;
  subtitle: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  align: 'left' | 'center' | 'right';
  titleSize: number;
  subtitleSize: number;
  titleColor: string;
  fontFamily: string;
  fontWeight: number;
  // Visual
  overlayOpacity: number;
  // Render result
  renderedUrl?: string;
}

const FONTS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Sora', label: 'Sora' },
  { id: 'Space Grotesk', label: 'Space' },
  { id: 'Outfit', label: 'Outfit' },
  { id: 'DM Sans', label: 'DM Sans' },
  { id: 'Manrope', label: 'Manrope' },
  { id: 'Plus Jakarta Sans', label: 'Jakarta' },
  { id: 'Bebas Neue', label: 'Bebas' },
];

const POSITIONS: { id: SlideState['position']; label: string }[] = [
  { id: 'top-left', label: 'Sup. Esq' },
  { id: 'top-center', label: 'Sup. Centro' },
  { id: 'top-right', label: 'Sup. Dir' },
  { id: 'middle-left', label: 'Meio Esq' },
  { id: 'middle-center', label: 'Centro' },
  { id: 'middle-right', label: 'Meio Dir' },
  { id: 'bottom-left', label: 'Inf. Esq' },
  { id: 'bottom-center', label: 'Inf. Centro' },
  { id: 'bottom-right', label: 'Inf. Dir' },
];

const COLORS = ['#ffffff', '#000000', '#FFD700', '#EF4444', '#3B82F6', '#22C55E', '#F97316', '#A855F7'];

function makeId() { return Math.random().toString(36).slice(2); }

function emptySlide(idx: number): SlideState {
  return {
    id: makeId(),
    backgroundUrl: '',
    backgroundPrompt: '',
    title: `Slide ${idx + 1}`,
    subtitle: 'Subtitulo do slide',
    position: 'middle-center',
    align: 'center',
    titleSize: 72,
    subtitleSize: 28,
    titleColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: 800,
    overlayOpacity: 0.4,
  };
}

function buildSlideHtml(slide: SlideState): string {
  const positionStyles: Record<SlideState['position'], string> = {
    'top-left': 'top:80px;left:80px;align-items:flex-start;justify-content:flex-start;text-align:left;',
    'top-center': 'top:80px;left:0;right:0;align-items:center;justify-content:flex-start;text-align:center;',
    'top-right': 'top:80px;right:80px;align-items:flex-end;justify-content:flex-start;text-align:right;',
    'middle-left': 'inset:0;align-items:flex-start;justify-content:center;text-align:left;padding-left:80px;',
    'middle-center': 'inset:0;align-items:center;justify-content:center;text-align:center;',
    'middle-right': 'inset:0;align-items:flex-end;justify-content:center;text-align:right;padding-right:80px;',
    'bottom-left': 'bottom:140px;left:80px;align-items:flex-start;justify-content:flex-end;text-align:left;',
    'bottom-center': 'bottom:140px;left:0;right:0;align-items:center;justify-content:flex-end;text-align:center;',
    'bottom-right': 'bottom:140px;right:80px;align-items:flex-end;justify-content:flex-end;text-align:right;',
  };
  const pos = positionStyles[slide.position];

  return `<div style="position:absolute;${pos};display:flex;flex-direction:column;gap:24px;max-width:85%;font-family:'${slide.fontFamily}',sans-serif;">
    <h1 style="font-size:${slide.titleSize}px;font-weight:${slide.fontWeight};color:${slide.titleColor};line-height:1.05;text-shadow:0 6px 40px rgba(0,0,0,0.6);margin:0;letter-spacing:-0.02em;">${escapeHtml(slide.title)}</h1>
    ${slide.subtitle ? `<p style="font-size:${slide.subtitleSize}px;font-weight:400;color:${slide.titleColor};opacity:0.9;line-height:1.3;text-shadow:0 4px 30px rgba(0,0,0,0.5);margin:0;">${escapeHtml(slide.subtitle)}</p>` : ''}
  </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function VisualEditorPage() {
  const router = useRouter();
  const [slides, setSlides] = useState<SlideState[]>([emptySlide(0)]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [genLoading, setGenLoading] = useState<string | null>(null);
  const [renderingAll, setRenderingAll] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = slides[activeIdx];

  useEffect(() => {
    api.listBrands()
      .then((r: any) => {
        setBrands(r.items || []);
        const def = (r.items || []).find((b: any) => b.isDefault);
        if (def) setBrandId(def.id);
      })
      .catch(() => {});
  }, []);

  function updateActive(patch: Partial<SlideState>) {
    setSlides((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, ...patch, renderedUrl: undefined } : s)));
  }

  function addSlide() {
    setSlides((prev) => {
      const next = [...prev, emptySlide(prev.length)];
      return next;
    });
    setActiveIdx(slides.length);
  }

  function removeSlide(id: string) {
    if (slides.length === 1) {
      setMessage('Voce precisa de pelo menos 1 slide');
      setMessageType('error');
      return;
    }
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setActiveIdx(Math.max(0, activeIdx - 1));
  }

  async function handleUploadBackground(file: File) {
    setGenLoading('upload');
    try {
      const result = await api.uploadFile(file);
      updateActive({ backgroundUrl: result.fileUrl });
    } catch (err: any) {
      setMessage(err.message || 'Erro no upload');
      setMessageType('error');
    }
    setGenLoading(null);
  }

  async function handleGenerateBackground() {
    if (!active.backgroundPrompt.trim()) {
      setMessage('Descreva o fundo primeiro');
      setMessageType('error');
      return;
    }
    setGenLoading('bg');
    try {
      const result = await api.generateImage(active.backgroundPrompt, aspectRatio);
      updateActive({ backgroundUrl: result.imageUrl });
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar fundo');
      setMessageType('error');
    }
    setGenLoading(null);
  }

  async function renderSlide(slide: SlideState): Promise<string> {
    const html = buildSlideHtml(slide);
    const result = await api.generateComposed({
      html,
      backgroundUrl: slide.backgroundUrl || undefined,
      backgroundPrompt: !slide.backgroundUrl ? (slide.backgroundPrompt || slide.title) : undefined,
      aspectRatio,
      overlayOpacity: slide.overlayOpacity,
      brandId: brandId || undefined,
      applyBrand: !!brandId,
    });
    return result.imageUrl;
  }

  async function handleRenderAll() {
    setRenderingAll(true);
    setMessage('');
    try {
      const updated: SlideState[] = [];
      for (const slide of slides) {
        const url = await renderSlide(slide);
        updated.push({ ...slide, renderedUrl: url });
      }
      setSlides(updated);
      setMessage(`${updated.length} slides renderizados!`);
      setMessageType('success');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao renderizar');
      setMessageType('error');
    }
    setRenderingAll(false);
  }

  async function handleSavePost(action: 'draft' | 'schedule') {
    setSavingPost(true);
    setMessage('');
    try {
      // Render any slides not yet rendered
      const finalSlides: SlideState[] = [];
      for (const slide of slides) {
        if (slide.renderedUrl) {
          finalSlides.push(slide);
        } else {
          const url = await renderSlide(slide);
          finalSlides.push({ ...slide, renderedUrl: url });
        }
      }
      setSlides(finalSlides);

      const urls = finalSlides.map((s) => s.renderedUrl!).filter(Boolean);
      if (urls.length === 0) throw new Error('Nenhum slide renderizado');

      const isCarousel = urls.length >= 2;
      const payload: Record<string, unknown> = {
        caption,
        hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        aspectRatio,
        editorState: { slides: finalSlides, brandId, aspectRatio },
      };
      if (isCarousel) {
        payload.isCarousel = true;
        payload.images = urls.map((url, idx) => ({ imageUrl: url, order: idx }));
      } else {
        payload.imageUrl = urls[0];
      }

      const post = (await api.createPost(payload)) as any;

      if (action === 'schedule' && scheduledAt) {
        await api.schedulePost(post.id, new Date(scheduledAt).toISOString());
        setMessage('Post agendado!');
      } else {
        setMessage('Rascunho salvo!');
      }
      setMessageType('success');
      setTimeout(() => router.push('/posts'), 1500);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao salvar');
      setMessageType('error');
    }
    setSavingPost(false);
  }

  const aspectClass = aspectRatio === '4:5' ? 'aspect-[4/5]' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square';

  return (
    <div className="max-w-[1800px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/posts" className="text-xs text-text-secondary hover:text-primary inline-flex items-center gap-1 mb-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </Link>
          <h1 className="text-page-title text-text-primary">Editor Visual</h1>
          <p className="text-sm text-text-secondary mt-0.5">Crie carrosseis no estilo canvas. Click num slide para editar.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Aspect ratio */}
          <div className="flex items-center bg-bg-main rounded-lg p-0.5">
            {(['1:1', '4:5', '9:16'] as AspectRatio[]).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${aspectRatio === ar ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                {ar}
              </button>
            ))}
          </div>

          <button
            onClick={handleRenderAll}
            disabled={renderingAll}
            className="btn-ghost text-xs"
          >
            {renderingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {renderingAll ? 'Renderizando...' : 'Renderizar todos'}
          </button>

          <button
            onClick={() => handleSavePost('draft')}
            disabled={savingPost}
            className="btn-ghost text-xs"
          >
            {savingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar rascunho
          </button>

          <button
            onClick={() => handleSavePost('schedule')}
            disabled={savingPost || !scheduledAt}
            className="btn-cta text-xs"
          >
            {savingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Agendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Canvas area */}
        <div className="col-span-9 space-y-4">
          {/* Slide thumbnails row */}
          <div className="card p-4 overflow-x-auto">
            <div className="flex items-start gap-3 min-w-min">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`relative ${aspectClass} w-44 flex-shrink-0 rounded-card overflow-hidden cursor-pointer border-2 transition-all ${
                    idx === activeIdx ? 'border-primary shadow-lg scale-105' : 'border-border hover:border-primary/50'
                  }`}
                  style={{
                    background: slide.backgroundUrl
                      ? `url('${slide.backgroundUrl}') center/cover`
                      : 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  }}
                >
                  {/* dark overlay */}
                  <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${slide.overlayOpacity})` }} />
                  {/* preview content */}
                  <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                    <div>
                      <p className="text-white text-xs font-bold leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                        {slide.title}
                      </p>
                      {slide.subtitle && (
                        <p className="text-white/80 text-[9px] mt-1" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
                          {slide.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Slide number badge */}
                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{idx + 1}</div>
                  {/* Rendered indicator */}
                  {slide.renderedUrl && (
                    <div className="absolute top-1.5 right-1.5 bg-status-published text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">OK</div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                    className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded text-white flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                onClick={addSlide}
                className={`${aspectClass} w-44 flex-shrink-0 rounded-card border-2 border-dashed border-border hover:border-primary text-text-muted hover:text-primary flex items-center justify-center transition-all`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-semibold">Novo slide</span>
                </div>
              </button>
            </div>
          </div>

          {/* Big preview of active slide */}
          <div className="card p-6">
            <div className={`${aspectClass} w-full max-w-[600px] mx-auto rounded-card overflow-hidden relative shadow-xl`}
              style={{
                background: active.backgroundUrl
                  ? `url('${active.backgroundUrl}') center/cover`
                  : 'linear-gradient(135deg, #1a1a2e, #16213e)',
              }}
            >
              {/* Dark overlay */}
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${active.overlayOpacity})` }} />

              {/* Title rendering with same logic as buildSlideHtml */}
              <div
                className="absolute flex flex-col gap-4 max-w-[85%]"
                style={{
                  ...(active.position === 'top-left' && { top: '8%', left: '8%', alignItems: 'flex-start', textAlign: 'left' }),
                  ...(active.position === 'top-center' && { top: '8%', left: 0, right: 0, alignItems: 'center', textAlign: 'center' }),
                  ...(active.position === 'top-right' && { top: '8%', right: '8%', alignItems: 'flex-end', textAlign: 'right' }),
                  ...(active.position === 'middle-left' && { inset: 0, alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', paddingLeft: '8%' }),
                  ...(active.position === 'middle-center' && { inset: 0, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }),
                  ...(active.position === 'middle-right' && { inset: 0, alignItems: 'flex-end', justifyContent: 'center', textAlign: 'right', paddingRight: '8%' }),
                  ...(active.position === 'bottom-left' && { bottom: '13%', left: '8%', alignItems: 'flex-start', textAlign: 'left' }),
                  ...(active.position === 'bottom-center' && { bottom: '13%', left: 0, right: 0, alignItems: 'center', textAlign: 'center' }),
                  ...(active.position === 'bottom-right' && { bottom: '13%', right: '8%', alignItems: 'flex-end', textAlign: 'right' }),
                  fontFamily: `'${active.fontFamily}', sans-serif`,
                  display: 'flex',
                  justifyContent: active.position.startsWith('middle') ? 'center' : (active.position.startsWith('top') ? 'flex-start' : 'flex-end'),
                }}
              >
                <h1
                  style={{
                    fontSize: `${active.titleSize / 1.8}px`,
                    fontWeight: active.fontWeight,
                    color: active.titleColor,
                    lineHeight: 1.05,
                    textShadow: '0 6px 40px rgba(0,0,0,0.6)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {active.title}
                </h1>
                {active.subtitle && (
                  <p
                    style={{
                      fontSize: `${active.subtitleSize / 1.8}px`,
                      fontWeight: 400,
                      color: active.titleColor,
                      opacity: 0.9,
                      lineHeight: 1.3,
                      textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                      margin: 0,
                    }}
                  >
                    {active.subtitle}
                  </p>
                )}
              </div>
            </div>
            <p className="text-center text-xs text-text-muted mt-3">
              Slide {activeIdx + 1} de {slides.length} - {active.renderedUrl ? 'renderizado' : 'preview ao vivo (clique em renderizar para gerar PNG final)'}
            </p>
          </div>

          {/* Caption + Schedule */}
          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Legenda do post</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={2200}
                placeholder="Legenda compartilhada por todos os slides quando publicado..."
                className="input-field resize-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Hashtags</label>
                <input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="ia, design, tutorial"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Agendar para (opcional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`px-4 py-3 rounded-btn border text-sm ${
              messageType === 'success' ? 'bg-emerald-50 border-emerald-200 text-status-published' : 'bg-red-50 border-red-200 text-status-failed'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Right sidebar with properties */}
        <div className="col-span-3 space-y-3 sticky top-4 self-start">
          {/* Brand selector */}
          <div className="card p-4">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Brand (global)
            </h3>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="input-field text-xs"
            >
              <option value="">Sem brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.isDefault ? ' (padrao)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1.5">Logo e cores do brand sao aplicados ao renderizar</p>
          </div>

          {/* Background section */}
          <div className="card p-4">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Imagem de fundo
            </h3>

            {active.backgroundUrl && (
              <div className="relative mb-2">
                <img src={active.backgroundUrl} alt="" className="w-full h-24 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => updateActive({ backgroundUrl: '' })}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 hover:bg-red-500 text-white rounded flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleUploadBackground(e.target.files[0]); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={genLoading === 'upload'}
              className="btn-ghost text-[10px] w-full justify-center py-1.5 mb-2"
            >
              {genLoading === 'upload' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Upload imagem
            </button>

            <textarea
              value={active.backgroundPrompt}
              onChange={(e) => updateActive({ backgroundPrompt: e.target.value })}
              rows={2}
              placeholder="Ex: gradiente roxo abstrato com formas geometricas"
              className="input-field text-[11px] resize-none"
            />
            <button
              onClick={handleGenerateBackground}
              disabled={genLoading === 'bg' || !active.backgroundPrompt}
              className="btn-cta text-[10px] w-full justify-center py-1.5 mt-2"
            >
              {genLoading === 'bg' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Gerar fundo com IA
            </button>

            <div className="mt-3">
              <label className="text-[10px] font-semibold text-text-muted uppercase">Escurecer fundo: {Math.round(active.overlayOpacity * 100)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={active.overlayOpacity}
                onChange={(e) => updateActive({ overlayOpacity: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Title section */}
          <div className="card p-4">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Titulo & Subtitulo
            </h3>

            <textarea
              value={active.title}
              onChange={(e) => updateActive({ title: e.target.value })}
              rows={2}
              placeholder="Titulo"
              className="input-field text-xs resize-none mb-2"
            />
            <textarea
              value={active.subtitle}
              onChange={(e) => updateActive({ subtitle: e.target.value })}
              rows={2}
              placeholder="Subtitulo"
              className="input-field text-xs resize-none mb-3"
            />

            {/* Position grid */}
            <label className="text-[10px] font-semibold text-text-muted uppercase mb-1 block">Posicao</label>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updateActive({ position: p.id })}
                  className={`text-[9px] py-1.5 rounded border ${
                    active.position === p.id ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Title size */}
            <div className="mb-2">
              <label className="text-[10px] font-semibold text-text-muted uppercase">Titulo: {active.titleSize}px</label>
              <input
                type="range"
                min={32}
                max={140}
                step={2}
                value={active.titleSize}
                onChange={(e) => updateActive({ titleSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Subtitle size */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-text-muted uppercase">Subtitulo: {active.subtitleSize}px</label>
              <input
                type="range"
                min={14}
                max={56}
                step={2}
                value={active.subtitleSize}
                onChange={(e) => updateActive({ subtitleSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Font family */}
            <label className="text-[10px] font-semibold text-text-muted uppercase mb-1 block">Fonte</label>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateActive({ fontFamily: f.id })}
                  style={{ fontFamily: `'${f.id}', sans-serif` }}
                  className={`text-[10px] py-1.5 rounded border font-bold ${
                    active.fontFamily === f.id ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Weight */}
            <label className="text-[10px] font-semibold text-text-muted uppercase mb-1 block">Peso</label>
            <div className="grid grid-cols-5 gap-1 mb-3">
              {[300, 400, 600, 700, 900].map((w) => (
                <button
                  key={w}
                  onClick={() => updateActive({ fontWeight: w })}
                  className={`text-[10px] py-1 rounded border ${
                    active.fontWeight === w ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-secondary'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Color */}
            <label className="text-[10px] font-semibold text-text-muted uppercase mb-1 block">Cor</label>
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateActive({ titleColor: c })}
                  style={{ background: c }}
                  className={`h-7 rounded border-2 ${active.titleColor === c ? 'border-primary' : 'border-border'}`}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
