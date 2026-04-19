'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Zap, Image as ImageIcon, Edit3, Clock, Send, Save, Loader2, X, Heart, MessageCircle, Share, ChevronLeft, ChevronRight, Layers, Plus, Trash2, Upload, FileText, Link as LinkIcon } from 'lucide-react';

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', desc: 'Feed' },
  { value: '4:5', label: '4:5', desc: 'Retrato' },
  { value: '9:16', label: '9:16', desc: 'Stories/Reels' },
];

interface CarouselImage {
  url: string;
  prompt?: string;
}

export default function NewPost() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hashtags, setHashtags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showFullImage, setShowFullImage] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [postFile, setPostFile] = useState({ url: '', name: '' });
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
  const [genMode, setGenMode] = useState<'ai' | 'template' | 'misto' | 'composed'>('ai');
  const [publishMode, setPublishMode] = useState<'FEED' | 'STORIES'>('FEED');
  const [selectedTemplate, setSelectedTemplate] = useState('bold-gradient');
  const [templateSubtitle, setTemplateSubtitle] = useState('');
  const [mistoSlideText, setMistoSlideText] = useState('');
  const [mistoSlideSubtitle, setMistoSlideSubtitle] = useState('');
  const [composedBgPrompt, setComposedBgPrompt] = useState('');
  const [composedHtml, setComposedHtml] = useState('');
  const [composedOverlayOpacity, setComposedOverlayOpacity] = useState(0.4);
  const [composedBrandId, setComposedBrandId] = useState<string>('');
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);

  const TEMPLATES = [
    { id: 'bold-gradient', name: 'Gradiente Bold', emoji: '🟣' },
    { id: 'minimal-dark', name: 'Minimal Dark', emoji: '⚫' },
    { id: 'neon-card', name: 'Neon Card', emoji: '💜' },
    { id: 'quote-elegant', name: 'Citacao', emoji: '✨' },
    { id: 'stats-impact', name: 'Impacto', emoji: '📊' },
    { id: 'split-color', name: 'Split', emoji: '🎨' },
  ];

  useEffect(() => {
    api.listBrands()
      .then((r: any) => {
        setAvailableBrands(r.items || []);
        const def = (r.items || []).find((b: any) => b.isDefault);
        if (def) setComposedBrandId(def.id);
      })
      .catch(() => { /* ignore */ });
  }, []);

  async function handleGenerateComposed() {
    if (!composedHtml.trim()) {
      setMessage('HTML do overlay e obrigatorio');
      setMessageType('error');
      return;
    }
    if (!composedBgPrompt.trim()) {
      setMessage('Prompt do fundo e obrigatorio');
      setMessageType('error');
      return;
    }
    setGenLoading(true);
    setMessage('');
    try {
      const result = await api.generateComposed({
        html: composedHtml,
        backgroundPrompt: composedBgPrompt,
        aspectRatio,
        overlayOpacity: composedOverlayOpacity,
        brandId: composedBrandId || undefined,
        applyBrand: !!composedBrandId,
      });
      setImages((prev) => [...prev, { url: result.imageUrl, prompt: composedBgPrompt }]);
      setActiveImageIndex(images.length);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar imagem composta');
      setMessageType('error');
    }
    setGenLoading(false);
  }

  async function handleGenerateTemplate() {
    if (!prompt) return;
    setGenLoading(true);
    setMessage('');
    try {
      const result = await api.generateTemplate({
        title: prompt,
        subtitle: templateSubtitle || undefined,
        template: selectedTemplate,
        aspectRatio,
      });
      setImages((prev) => [...prev, { url: result.imageUrl, prompt }]);
      setActiveImageIndex(images.length);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar template');
      setMessageType('error');
    }
    setGenLoading(false);
  }

  async function handleMistoSlide() {
    if (!mistoSlideText) return;
    setGenLoading(true);
    setMessage('');
    try {
      const result = await api.generateTemplate({
        title: mistoSlideText,
        subtitle: mistoSlideSubtitle || undefined,
        template: selectedTemplate,
        aspectRatio,
      });
      setImages((prev) => [...prev, { url: result.imageUrl, prompt: mistoSlideText }]);
      setActiveImageIndex(images.length);
      setMistoSlideText('');
      setMistoSlideSubtitle('');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar slide');
      setMessageType('error');
    }
    setGenLoading(false);
  }

  async function handleMistoCover() {
    if (!prompt) return;
    setGenLoading(true);
    setMessage('');
    try {
      const result = await api.generateImage(prompt, aspectRatio);
      setImages((prev) => {
        const newImages = [{ url: result.imageUrl, prompt }, ...prev];
        return newImages;
      });
      setActiveImageIndex(0);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar capa');
      setMessageType('error');
    }
    setGenLoading(false);
  }

  async function handleFileUpload(file: File) {
    setFileUploading(true);
    try {
      const result = await api.uploadFile(file);
      setPostFile({ url: result.fileUrl, name: result.fileName });
    } catch (err: any) {
      setMessage(err.message || 'Erro ao enviar arquivo');
      setMessageType('error');
    }
    setFileUploading(false);
  }

  async function handleImageUpload(files: FileList) {
    const remaining = 10 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      setMessage('Maximo de 10 imagens por carrossel');
      setMessageType('error');
      return;
    }
    setUploadLoading(true);
    setMessage('');
    try {
      if (toUpload.length === 1) {
        const result = await api.uploadImage(toUpload[0]);
        setImages((prev) => [...prev, { url: result.imageUrl }]);
        setActiveImageIndex(images.length);
      } else {
        const result = await api.uploadMultipleImages(toUpload);
        const newImages = result.images.map((img) => ({ url: img.imageUrl }));
        setImages((prev) => [...prev, ...newImages]);
        setActiveImageIndex(images.length + newImages.length - 1);
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro ao enviar imagem');
      setMessageType('error');
    }
    setUploadLoading(false);
  }

  async function handleGenerateImage() {
    if (!prompt) return;
    const remaining = 10 - images.length;
    const count = Math.min(imageCount, remaining);
    if (count <= 0) {
      setMessage('Maximo de 10 imagens por carrossel');
      setMessageType('error');
      return;
    }
    setGenLoading(true);
    setMessage('');
    setGenProgress(referenceImage ? 'Editando imagem com IA...' : (count > 1 ? `0/${count} imagens geradas...` : ''));

    let generated = 0;
    const newImages: CarouselImage[] = [];

    if (referenceImage) {
      try {
        const result = await api.generateImageEdit(prompt, referenceImage.file, aspectRatio);
        newImages.push({ url: result.imageUrl, prompt });
      } catch (err: any) {
        setMessage(err.message || 'Erro ao editar imagem');
        setMessageType('error');
      }
    } else {
      const promises = Array.from({ length: count }, async (_, i) => {
        try {
          const variation = count > 1 ? `${prompt} - variacao ${i + 1} de ${count}` : prompt;
          const result = await api.generateImage(variation, aspectRatio);
          newImages.push({ url: result.imageUrl, prompt: variation });
          generated++;
          if (count > 1) setGenProgress(`${generated}/${count} imagens geradas...`);
        } catch {
          // skip failed
        }
      });

      await Promise.all(promises);
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      setActiveImageIndex(images.length + newImages.length - 1);
    } else if (!referenceImage) {
      setMessage('Nenhuma imagem gerada. Tente novamente.');
      setMessageType('error');
    }
    setGenProgress('');
    setGenLoading(false);
  }

  async function handleGenerateCaption() {
    if (!prompt) return;
    setGenLoading(true);
    try {
      const result = await api.generateCaption(prompt);
      setCaption(result.caption);
      setHashtags(result.hashtags.join(', '));
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar legenda');
      setMessageType('error');
    }
    setGenLoading(false);
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (activeImageIndex >= images.length - 1) {
      setActiveImageIndex(Math.max(0, images.length - 2));
    }
  }

  async function handleSave(status: 'draft' | 'schedule' | 'publish') {
    setLoading(true);
    setMessage('');
    try {
      const isCarousel = images.length >= 2;
      const payload: Record<string, unknown> = {
        caption,
        hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        nanoPrompt: prompt || undefined,
        aspectRatio,
      };

      if (driveLink) payload.driveLink = driveLink;
      if (postFile.url) payload.fileUrl = postFile.url;

      if (isCarousel) {
        payload.isCarousel = true;
        payload.images = images.map((img, idx) => ({
          imageUrl: img.url,
          order: idx,
          prompt: img.prompt,
        }));
      } else if (images.length === 1) {
        payload.imageUrl = images[0].url;
      }

      const post = (await api.createPost(payload)) as any;

      if (status === 'schedule' && scheduledAt) {
        await api.schedulePost(post.id, new Date(scheduledAt).toISOString());
        setMessage('Post agendado com sucesso!');
        setMessageType('success');
      } else if (status === 'publish') {
        await api.publishPost(post.id, publishMode);
        setMessage(`Post publicado como ${publishMode === 'STORIES' ? 'Stories' : 'Feed'}!`);
        setMessageType('success');
      } else {
        setMessage('Rascunho salvo!');
        setMessageType('success');
      }
      setTimeout(() => router.push('/posts'), 1500);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao salvar');
      setMessageType('error');
    }
    setLoading(false);
  }

  const previewAspect = aspectRatio === '4:5' ? 'aspect-[4/5]' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square';

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page-title text-text-primary">Criar Post</h1>
        <p className="text-sm text-text-secondary mt-1">Gere imagens e legendas com inteligencia artificial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-5">
          {/* Generation Mode Toggle + Content */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent-pink/10">
                  <Zap className="w-4 h-4 text-primary" strokeWidth={2} />
                </div>
                <h2 className="text-sm font-bold text-text-primary">Gerar Imagem</h2>
              </div>
              <div className="flex items-center bg-bg-main rounded-lg p-0.5 flex-wrap">
                <button
                  onClick={() => setGenMode('ai')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${genMode === 'ai' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  IA
                </button>
                <button
                  onClick={() => setGenMode('template')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${genMode === 'template' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Template
                </button>
                <button
                  onClick={() => setGenMode('misto')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${genMode === 'misto' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Misto
                </button>
                <button
                  onClick={() => setGenMode('composed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${genMode === 'composed' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  HTML + IA
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {/* Reference image for AI editing */}
              {genMode === 'ai' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Imagem de referencia (opcional)</label>
                  <input
                    ref={refImageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const preview = URL.createObjectURL(f);
                        setReferenceImage({ file: f, preview });
                      }
                      e.target.value = '';
                    }}
                  />
                  {referenceImage ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-main border border-border">
                      <img src={referenceImage.preview} alt="Referencia" className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">{referenceImage.file.name}</p>
                        <p className="text-[10px] text-primary">A IA vai editar esta imagem com base no prompt</p>
                      </div>
                      <button onClick={() => { setReferenceImage(null); }} className="p-1.5 rounded-lg hover:bg-bg-card transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5 text-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => refImageInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border text-xs font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                      Anexar foto para a IA editar
                    </button>
                  )}
                  <p className="text-[10px] text-text-muted mt-1">Envie uma foto e descreva no prompt o que a IA deve fazer: melhorar, adicionar texto, mudar estilo, etc.</p>
                </div>
              )}

              {/* Shared: Prompt/Title field (AI and Template modes) */}
              {genMode !== 'misto' && genMode !== 'composed' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                    {genMode === 'ai' ? (referenceImage ? 'O que fazer com a imagem' : 'Prompt') : 'Texto Principal'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={genMode === 'ai' ? (referenceImage ? "Ex: 'Melhore essa foto, coloque a frase VIVA A VIDA em letras grandes no centro'" : "Descreva o tema do post... Ex: 'Post sobre produtividade com dicas de organizacao'") : "Texto que aparece no post... Ex: '5 dicas de produtividade'"}
                    rows={genMode === 'template' ? 2 : 3}
                    className="input-field resize-none"
                  />
                </div>
              )}
              {/* Template mode: subtitle + template selector */}
              {genMode === 'template' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Subtitulo (opcional)</label>
                    <input
                      value={templateSubtitle}
                      onChange={(e) => setTemplateSubtitle(e.target.value)}
                      placeholder="Texto complementar..."
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Template</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t.id)}
                          className={`p-2.5 rounded-lg text-center transition-all border ${
                            selectedTemplate === t.id
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border bg-bg-card text-text-secondary hover:border-primary/30'
                          }`}
                        >
                          <div className="text-lg mb-0.5">{t.emoji}</div>
                          <div className="text-[10px] font-semibold">{t.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateTemplate}
                    disabled={genLoading || !prompt}
                    className="btn-cta w-full justify-center text-xs py-2.5"
                  >
                    {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" strokeWidth={1.5} />}
                    {genLoading ? 'Gerando...' : 'Gerar com Template'}
                  </button>
                </>
              )}

              {/* AI mode: Quantity + buttons */}
              {genMode === 'ai' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Quantidade de imagens</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setImageCount(n)}
                          disabled={n + images.length > 10}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            imageCount === n
                              ? 'bg-primary text-white shadow-sm'
                              : n + images.length > 10
                              ? 'bg-bg-main text-text-muted/30 cursor-not-allowed'
                              : 'bg-bg-main text-text-secondary hover:border-primary/50 hover:text-primary'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {imageCount >= 2 && (
                      <p className="text-[10px] text-primary mt-1.5 font-medium flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Vai gerar {imageCount} imagens (carrossel)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateImage} disabled={genLoading || !prompt} className="btn-cta flex-1 justify-center text-xs py-2.5">
                      {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : referenceImage ? <Zap className="w-4 h-4" strokeWidth={1.5} /> : imageCount >= 2 ? <Layers className="w-4 h-4" strokeWidth={1.5} /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
                      {genLoading ? (genProgress || 'Gerando...') : referenceImage ? 'Editar com IA' : imageCount >= 2 ? `Gerar Carrossel (${imageCount})` : images.length > 0 ? 'Adicionar Imagem' : 'Gerar Imagem'}
                    </button>
                    <button onClick={handleGenerateCaption} disabled={genLoading || !prompt} className="btn-ghost flex-1 justify-center text-xs py-2.5">
                      <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                      Gerar Legenda
                    </button>
                  </div>
                  {/* Upload from gallery */}
                  <div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => { if (e.target.files?.length) handleImageUpload(e.target.files); e.target.value = ''; }}
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadLoading || images.length >= 10}
                      className="btn-ghost w-full justify-center text-xs py-2.5 border-dashed"
                    >
                      {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
                      {uploadLoading ? 'Enviando...' : 'Enviar imagem da galeria'}
                    </button>
                    <p className="text-[10px] text-text-muted mt-1 text-center">JPG, PNG ou WebP. Selecione varias para carrossel.</p>
                  </div>
                </div>
              )}

              {/* Misto mode: AI cover + Template slides */}
              {genMode === 'misto' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-text-muted bg-bg-main rounded-lg px-3 py-2">
                    Capa gerada por IA + slides em HTML/Template. Gere a capa primeiro, depois adicione os slides.
                  </p>

                  {/* Step 1: AI Cover */}
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Capa (IA)</h3>
                      {images.length > 0 && (
                        <span className="text-[10px] text-status-published bg-emerald-500/10 px-2 py-0.5 rounded-badge font-medium ml-auto">Gerada</span>
                      )}
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Descreva a imagem de capa... Ex: 'Imagem vibrante sobre produtividade com icones modernos'"
                      rows={2}
                      className="input-field resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleMistoCover}
                        disabled={genLoading || !prompt || images.length >= 10}
                        className="btn-cta flex-1 justify-center text-xs py-2"
                      >
                        {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" strokeWidth={2} />}
                        {genLoading ? 'Gerando...' : images.length > 0 ? 'Regerar Capa' : 'Gerar Capa com IA'}
                      </button>
                      <button onClick={handleGenerateCaption} disabled={genLoading || !prompt} className="btn-ghost flex-1 justify-center text-xs py-2">
                        <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Gerar Legenda
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Template Slides */}
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-pink/10 flex items-center justify-center text-[10px] font-bold text-accent-pink">2</div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Slides (Template)</h3>
                      {images.length >= 2 && (
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-badge font-medium ml-auto">{images.length - 1} slides</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Texto do slide</label>
                      <input
                        value={mistoSlideText}
                        onChange={(e) => setMistoSlideText(e.target.value)}
                        placeholder="Ex: '5 dicas de produtividade'"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Subtitulo (opcional)</label>
                      <input
                        value={mistoSlideSubtitle}
                        onChange={(e) => setMistoSlideSubtitle(e.target.value)}
                        placeholder="Texto complementar..."
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Template</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplate(t.id)}
                            className={`p-2 rounded-lg text-center transition-all border ${
                              selectedTemplate === t.id
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-bg-card text-text-secondary hover:border-primary/30'
                            }`}
                          >
                            <div className="text-base mb-0.5">{t.emoji}</div>
                            <div className="text-[9px] font-semibold">{t.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleMistoSlide}
                      disabled={genLoading || !mistoSlideText || images.length >= 10}
                      className="btn-ghost w-full justify-center text-xs py-2 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                      {genLoading ? 'Gerando...' : 'Adicionar Slide'}
                    </button>
                  </div>
                </div>
              )}

              {/* Composed mode: AI background + HTML/Tailwind overlay */}
              {genMode === 'composed' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-text-muted bg-bg-main rounded-lg px-3 py-2">
                    Imagem de fundo gerada por IA + overlay HTML/Tailwind por cima.
                    Use as variaveis CSS do brand: <code className="text-primary">var(--brand-primary)</code>, <code className="text-primary">var(--brand-secondary)</code>, <code className="text-primary">var(--brand-accent)</code>.
                  </p>

                  {/* Background prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Prompt do fundo (IA)</label>
                      <button
                        type="button"
                        onClick={() => setComposedBgPrompt(prompt)}
                        disabled={!prompt}
                        className="text-[10px] text-primary hover:underline disabled:opacity-30 disabled:no-underline"
                      >
                        Usar prompt do post
                      </button>
                    </div>
                    <textarea
                      value={composedBgPrompt}
                      onChange={(e) => setComposedBgPrompt(e.target.value)}
                      placeholder="Ex: 'Fundo abstrato com formas geometricas roxas e gradiente, estilo moderno'"
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>

                  {/* HTML overlay */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">HTML do overlay</label>
                    <textarea
                      value={composedHtml}
                      onChange={(e) => setComposedHtml(e.target.value)}
                      placeholder={`<div class="flex items-center justify-center w-full h-full p-16">
  <h1 class="text-7xl font-black text-white text-center" style="text-shadow: 0 4px 30px rgba(0,0,0,0.6);">
    Seu titulo
  </h1>
</div>`}
                      rows={8}
                      className="input-field resize-none font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-text-muted mt-1">Tailwind CSS disponivel via CDN. Use absolute, flex, grid, classes utilitarias.</p>
                  </div>

                  {/* Brand selector */}
                  {availableBrands.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Aplicar Brand (cores + logo)</label>
                      <select
                        value={composedBrandId}
                        onChange={(e) => setComposedBrandId(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Nenhum (HTML puro)</option>
                        {availableBrands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.isDefault ? '(padrao)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Overlay opacity */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                      Escurecer fundo: {Math.round(composedOverlayOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={composedOverlayOpacity}
                      onChange={(e) => setComposedOverlayOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-text-muted">Camada escura entre fundo e HTML para textos brancos ficarem legiveis</p>
                  </div>

                  <button
                    onClick={handleGenerateComposed}
                    disabled={genLoading || !composedHtml || !composedBgPrompt}
                    className="btn-cta w-full justify-center text-xs py-2.5"
                  >
                    {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" strokeWidth={1.5} />}
                    {genLoading ? 'Gerando fundo + compondo...' : 'Gerar Imagem Composta'}
                  </button>
                </div>
              )}

              {images.length > 0 && (
                <div className="text-center">
                  <span className="text-xs text-text-muted">
                    {images.length}/10 imagens
                    {images.length === 1 && ' (adicione mais 1 para carrossel)'}
                    {images.length >= 2 && (
                      <span className="inline-flex items-center gap-1 ml-1.5 text-primary font-medium">
                        <Layers className="w-3 h-3" /> carrossel
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Tamanho da imagem</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`py-3 px-3 rounded-btn text-sm border transition-all duration-200 ${
                    aspectRatio === ar.value
                      ? 'bg-primary/[0.08] border-primary text-primary shadow-sm'
                      : 'bg-bg-card border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  <span className="font-bold block">{ar.label}</span>
                  <span className="text-xs opacity-60 block mt-0.5">{ar.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Legenda</label>
              <span className="text-[11px] text-text-muted tabular-nums">{caption.length}/2200</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200}
              rows={5}
              placeholder="Escreva a legenda do post..."
              className="input-field resize-none"
            />
          </div>

          {/* Hashtags */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Hashtags</label>
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="IA, Tech, Programacao (separadas por virgula)" className="input-field" />
            {hashtags && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {hashtags.split(',').filter(h => h.trim()).map((h, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-badge bg-primary/10 text-primary font-medium">
                    #{h.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Agendar para</label>
              <button
                type="button"
                onClick={() => { setShowSchedule(!showSchedule); if (showSchedule) setScheduledAt(''); }}
                className={`text-xs font-medium px-2.5 py-1 rounded-badge transition-colors ${showSchedule ? 'bg-primary/10 text-primary' : 'bg-bg-main text-text-muted hover:text-text-primary'}`}
              >
                {showSchedule ? 'Cancelar agendamento' : 'Definir data'}
              </button>
            </div>
            {showSchedule && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input-field mt-2"
              />
            )}
          </div>

          {/* File Upload */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Arquivo</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp"
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
            />
            {postFile.url ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-main border border-border">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                <a href={postFile.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">
                  {postFile.name || 'Arquivo'}
                </a>
                <button onClick={() => setPostFile({ url: '', name: '' })} className="p-1 rounded hover:bg-white transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
              >
                {fileUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={2} />}
                {fileUploading ? 'Enviando...' : 'Anexar arquivo'}
              </button>
            )}
          </div>

          {/* Google Drive Link */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Link do Google Drive</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
              <input
                type="text"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => handleSave('draft')} disabled={loading} className="btn-ghost flex-1 justify-center">
              <Save className="w-4 h-4" strokeWidth={1.5} />
              Rascunho
            </button>
            <button type="button" onClick={() => handleSave('schedule')} disabled={loading || !scheduledAt} className="btn-ghost flex-1 justify-center text-status-scheduled border-status-scheduled/30 hover:bg-blue-500/10 hover:text-status-scheduled">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
              Agendar
            </button>
            <div className="flex-1 flex gap-0.5">
              <button type="button" onClick={() => handleSave('publish')} disabled={loading} className="btn-cta flex-1 justify-center rounded-r-none">
                <Send className="w-4 h-4" strokeWidth={1.5} />
                {publishMode === 'STORIES' ? 'Stories' : 'Feed'}
              </button>
              <button
                type="button"
                onClick={() => setPublishMode(publishMode === 'FEED' ? 'STORIES' : 'FEED')}
                className="btn-cta px-2 rounded-l-none border-l border-white/20"
                title="Alternar Feed / Stories"
              >
                <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-btn border animate-slide-up ${
              messageType === 'success'
                ? 'bg-emerald-500/10 border-emerald-200 text-status-published'
                : 'bg-red-500/10 border-red-200 text-status-failed'
            }`}>
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="card p-5">
            <p className="text-xs font-semibold text-text-secondary mb-4 uppercase tracking-wider">Preview do Post</p>
            <div className="bg-bg-card rounded-2xl overflow-hidden border border-border">
              {/* Instagram Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-accent-pink">
                  <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-text-primary">instapost.ai</span>
                  <p className="text-[10px] text-text-muted">Patrocinado</p>
                </div>
              </div>

              {/* Image / Carousel */}
              {images.length > 0 ? (
                <div className="relative">
                  <div className={`${previewAspect} max-h-[500px] bg-bg-main flex items-center justify-center overflow-hidden`}>
                    <img
                      src={images[activeImageIndex]?.url}
                      alt={`Imagem ${activeImageIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowFullImage(true)}
                    />
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveImage(activeImageIndex)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Carousel navigation */}
                  {images.length > 1 && (
                    <>
                      {activeImageIndex > 0 && (
                        <button
                          onClick={() => setActiveImageIndex((i) => i - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-text-primary" />
                        </button>
                      )}
                      {activeImageIndex < images.length - 1 && (
                        <button
                          onClick={() => setActiveImageIndex((i) => i + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-text-primary" />
                        </button>
                      )}
                      {/* Dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`h-2 rounded-full transition-all ${
                              idx === activeImageIndex ? 'bg-primary w-4' : 'bg-white/60 w-2'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Counter */}
                      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {activeImageIndex + 1}/{images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="py-16 bg-bg-main flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <ImageIcon className="w-10 h-10" strokeWidth={1} />
                    <span className="text-xs">Imagem aparecera aqui</span>
                  </div>
                </div>
              )}

              {/* Instagram Actions */}
              <div className="px-4 py-3 flex gap-4">
                <Heart className="w-6 h-6 text-text-primary" strokeWidth={1.5} />
                <MessageCircle className="w-6 h-6 text-text-primary" strokeWidth={1.5} />
                <Share className="w-6 h-6 text-text-primary" strokeWidth={1.5} />
              </div>

              {/* Caption */}
              <div className="px-4 pb-4">
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {caption || <span className="text-text-muted">Legenda aparecera aqui...</span>}
                </p>
                {hashtags && (
                  <p className="text-sm text-primary mt-2">
                    {hashtags.split(',').filter(h => h.trim()).map((h) => `#${h.trim()}`).join(' ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && images.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 cursor-pointer modal-backdrop" onClick={() => setShowFullImage(false)}>
          <div className="relative modal-content">
            <img src={images[activeImageIndex]?.url} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-card shadow-2xl" />
            <button onClick={() => setShowFullImage(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
