'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Trash2, Pencil, Star, X, Loader2, Palette, Upload, Image as ImageIcon } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  mutedColor?: string | null;
  fontFamily?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  description?: string | null;
  voiceTone?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  products: string[];
  defaultHashtags: string[];
  isDefault: boolean;
}

const EMPTY_BRAND: Partial<Brand> = {
  name: '',
  logoUrl: '',
  primaryColor: '#6C5CE7',
  secondaryColor: '#E84393',
  accentColor: '',
  backgroundColor: '',
  textColor: '',
  mutedColor: '',
  fontFamily: '',
  headingFont: '',
  bodyFont: '',
  description: '',
  voiceTone: '',
  websiteUrl: '',
  instagramUrl: '',
  products: [],
  defaultHashtags: [],
  isDefault: false,
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Brand>>(EMPTY_BRAND);
  const [productsText, setProductsText] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadBrands() {
    setLoading(true);
    try {
      const result = await api.listBrands();
      setBrands(result.items as Brand[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadBrands(); }, []);

  function openCreate() {
    setEditing(EMPTY_BRAND);
    setProductsText('');
    setHashtagsText('');
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setProductsText((brand.products || []).join(', '));
    setHashtagsText((brand.defaultHashtags || []).join(', '));
    setModalOpen(true);
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      setEditing((prev) => ({ ...prev, logoUrl: result.fileUrl }));
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar logo');
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!editing.name?.trim()) { alert('Nome do brand e obrigatorio'); return; }
    setSaving(true);
    try {
      const body: any = {
        name: editing.name,
        logoUrl: editing.logoUrl || null,
        primaryColor: editing.primaryColor,
        secondaryColor: editing.secondaryColor,
        accentColor: editing.accentColor || null,
        backgroundColor: editing.backgroundColor || null,
        textColor: editing.textColor || null,
        mutedColor: editing.mutedColor || null,
        fontFamily: editing.fontFamily || null,
        headingFont: editing.headingFont || null,
        bodyFont: editing.bodyFont || null,
        description: editing.description || null,
        voiceTone: editing.voiceTone || null,
        websiteUrl: editing.websiteUrl || null,
        instagramUrl: editing.instagramUrl || null,
        products: productsText.split(',').map((p) => p.trim()).filter(Boolean),
        defaultHashtags: hashtagsText.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean),
        isDefault: editing.isDefault,
      };
      if (editing.id) {
        await api.updateBrand(editing.id, body);
      } else {
        await api.createBrand(body);
      }
      setModalOpen(false);
      await loadBrands();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este brand?')) return;
    try {
      await api.deleteBrand(id);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) { alert(err.message || 'Erro ao deletar'); }
  }

  async function handleSetDefault(id: string) {
    try {
      await api.setDefaultBrand(id);
      await loadBrands();
    } catch (err: any) { alert(err.message || 'Erro ao definir padrao'); }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">Brands</h1>
          <p className="text-sm text-text-secondary mt-1">
            Gerencie a identidade visual das suas marcas - logo, cores, produtos
          </p>
        </div>
        <button onClick={openCreate} className="btn-cta">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Brand
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-text-muted">Carregando brands...</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="card p-16 text-center">
          <Palette className="w-16 h-16 text-text-muted mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-base font-bold text-text-primary mb-2">Nenhum brand cadastrado</h3>
          <p className="text-sm text-text-muted mb-5">Cadastre seu primeiro brand para aplicar identidade visual nos seus posts</p>
          <button onClick={openCreate} className="btn-cta inline-flex">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Criar primeiro brand
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className="card p-5 hover:shadow-lg transition-all">
              {/* Color preview header */}
              <div
                className="h-20 rounded-xl mb-4 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
              >
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="absolute bottom-2 right-2 w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                  />
                )}
                {brand.isDefault && (
                  <span className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold text-primary px-2 py-1 rounded-badge flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    PADRAO
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-base font-bold text-text-primary mb-1">{brand.name}</h3>
                {brand.description && (
                  <p className="text-xs text-text-muted line-clamp-2">{brand.description}</p>
                )}
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md border border-border" style={{ background: brand.primaryColor }} />
                  <span className="text-[10px] text-text-muted font-mono">{brand.primaryColor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md border border-border" style={{ background: brand.secondaryColor }} />
                  <span className="text-[10px] text-text-muted font-mono">{brand.secondaryColor}</span>
                </div>
              </div>

              {brand.products.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-text-muted uppercase mb-1.5">Produtos</p>
                  <div className="flex flex-wrap gap-1">
                    {brand.products.slice(0, 3).map((p, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-badge bg-bg-main text-text-secondary">{p}</span>
                    ))}
                    {brand.products.length > 3 && (
                      <span className="text-[10px] text-text-muted">+{brand.products.length - 3}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => openEdit(brand)}
                  className="flex-1 px-3 py-1.5 rounded-badge text-xs font-semibold bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Editar
                </button>
                {!brand.isDefault && (
                  <button
                    onClick={() => handleSetDefault(brand.id)}
                    className="px-3 py-1.5 rounded-badge text-xs font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                    title="Tornar padrao"
                  >
                    <Star className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(brand.id)}
                  className="px-3 py-1.5 rounded-badge text-xs bg-red-50 text-status-failed hover:bg-red-100 transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-card w-full max-w-4xl shadow-lg modal-content max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header (sticky) */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-violet-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">{editing.id ? 'Editar Brand' : 'Novo Brand'}</h3>
                  <p className="text-xs text-text-secondary">Configure a identidade visual da sua marca</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-bg-main">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              {/* Section: Basico */}
              <section>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Basico</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Nome do Brand</label>
                    <input
                      value={editing.name || ''}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="Ex: Buildix Lab"
                      className="input-field"
                    />
                  </div>

                  {/* Logo upload */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Logo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); e.target.value = ''; }}
                    />
                    <div className="flex items-center gap-3">
                      {editing.logoUrl ? (
                        <div className="relative">
                          <img src={editing.logoUrl} alt="Logo" className="w-11 h-11 rounded-xl object-cover border border-border" />
                          <button
                            onClick={() => setEditing({ ...editing, logoUrl: '' })}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-text-muted" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-bg-main border border-dashed border-border flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
                        </div>
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-ghost text-xs"
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={2} />}
                        {uploading ? 'Enviando...' : editing.logoUrl ? 'Trocar logo' : 'Enviar logo'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Cores */}
              <section>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Cores</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                  {[
                    { key: 'primaryColor', label: 'Primaria', placeholder: '#6C5CE7', def: '#6C5CE7' },
                    { key: 'secondaryColor', label: 'Secundaria', placeholder: '#E84393', def: '#E84393' },
                    { key: 'accentColor', label: 'Accent', placeholder: '#FFC107', def: '#FFC107' },
                    { key: 'backgroundColor', label: 'Fundo', placeholder: '#FFFFFF', def: '#FFFFFF' },
                    { key: 'textColor', label: 'Texto', placeholder: '#1A1A1A', def: '#1A1A1A' },
                    { key: 'mutedColor', label: 'Neutro', placeholder: '#9CA3AF', def: '#9CA3AF' },
                  ].map(({ key, label, placeholder, def }) => {
                    const value = (editing as any)[key] || '';
                    return (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={value || def}
                            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                            className="w-12 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                          />
                          <input
                            value={value}
                            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="input-field font-mono text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section: Tipografia */}
              <section>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Tipografia</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Fonte Display</label>
                    <input
                      value={editing.fontFamily || ''}
                      onChange={(e) => setEditing({ ...editing, fontFamily: e.target.value })}
                      placeholder="Inter Variable"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Fonte Heading</label>
                    <input
                      value={editing.headingFont || ''}
                      onChange={(e) => setEditing({ ...editing, headingFont: e.target.value })}
                      placeholder="Sora"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Fonte Body</label>
                    <input
                      value={editing.bodyFont || ''}
                      onChange={(e) => setEditing({ ...editing, bodyFont: e.target.value })}
                      placeholder="Inter"
                      className="input-field"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Conteudo */}
              <section>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Conteudo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Tom de Voz</label>
                    <input
                      value={editing.voiceTone || ''}
                      onChange={(e) => setEditing({ ...editing, voiceTone: e.target.value })}
                      placeholder="Ex: profissional, descontraido, educativo"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Produtos / Servicos</label>
                    <input
                      value={productsText}
                      onChange={(e) => setProductsText(e.target.value)}
                      placeholder="Curso, Mentoria (separados por virgula)"
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Hashtags Padrao</label>
                    <input
                      value={hashtagsText}
                      onChange={(e) => setHashtagsText(e.target.value)}
                      placeholder="ia, tecnologia, programacao (separadas por virgula)"
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Descricao</label>
                    <textarea
                      value={editing.description || ''}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      rows={3}
                      placeholder="O que o brand faz? Quais sao seus diferenciais?"
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Links externos */}
              <section>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Links externos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Site (URL)</label>
                    <input
                      type="url"
                      value={editing.websiteUrl || ''}
                      onChange={(e) => setEditing({ ...editing, websiteUrl: e.target.value })}
                      placeholder="https://meusite.com"
                      className="input-field"
                    />
                    <p className="text-[10px] text-text-muted mt-1">Agentes de IA podem visitar para pesquisar informacoes</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Instagram (URL do perfil)</label>
                    <input
                      type="url"
                      value={editing.instagramUrl || ''}
                      onChange={(e) => setEditing({ ...editing, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/seu_usuario"
                      className="input-field"
                    />
                    <p className="text-[10px] text-text-muted mt-1">Agentes podem analisar o estilo para manter consistencia</p>
                  </div>
                </div>
              </section>

              {/* Default toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isDefault || false}
                  onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <span className="text-sm text-text-secondary">Definir como brand padrao</span>
              </label>
            </div>

            {/* Footer (sticky) */}
            <div className="flex gap-2 justify-end p-6 pt-4 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="btn-ghost text-xs">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-cta text-xs">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : 'Salvar Brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
