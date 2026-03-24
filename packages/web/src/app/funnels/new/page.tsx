'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { GitBranch, Loader2, FileText, ShoppingCart, Video, Users, Rocket, Zap } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'blank',
    title: 'Em Branco',
    description: 'Comece do zero',
    icon: FileText,
    color: '#6b7280',
    stages: [],
  },
  {
    id: 'launch',
    title: 'Lancamento Digital',
    description: 'Funil classico de lancamento de produto digital',
    icon: Rocket,
    color: '#8b5cf6',
    stages: [
      { title: 'Captura', color: '#8b5cf6', steps: [
        { title: 'Landing Page de Captura', type: 'LANDING_PAGE' },
        { title: 'Formulario de Lead', type: 'LEAD_CAPTURE' },
        { title: 'Pagina de Obrigado', type: 'THANK_YOU' },
      ]},
      { title: 'Aquecimento', color: '#6366f1', steps: [
        { title: 'Sequencia de Emails', type: 'EMAIL_SEQUENCE' },
        { title: 'Conteudo Gratuito (Video/Live)', type: 'VIDEO' },
        { title: 'Posts de Engajamento', type: 'SOCIAL_POST' },
      ]},
      { title: 'Lancamento', color: '#ec4899', steps: [
        { title: 'Video de Vendas', type: 'VIDEO' },
        { title: 'Pagina de Vendas', type: 'SALES_PAGE' },
        { title: 'Checkout', type: 'CHECKOUT' },
      ]},
      { title: 'Pos-Venda', color: '#10b981', steps: [
        { title: 'Upsell/Order Bump', type: 'UPSELL' },
        { title: 'Email de Boas Vindas', type: 'EMAIL_SEQUENCE' },
        { title: 'Area de Membros', type: 'THANK_YOU' },
      ]},
    ],
  },
  {
    id: 'webinar',
    title: 'Webinar',
    description: 'Funil de conversao via webinar/aula ao vivo',
    icon: Video,
    color: '#3b82f6',
    stages: [
      { title: 'Inscricao', color: '#3b82f6', steps: [
        { title: 'Landing Page do Webinar', type: 'LANDING_PAGE' },
        { title: 'Formulario de Inscricao', type: 'LEAD_CAPTURE' },
        { title: 'Pagina de Confirmacao', type: 'THANK_YOU' },
      ]},
      { title: 'Evento', color: '#6366f1', steps: [
        { title: 'Emails de Lembrete', type: 'EMAIL_SEQUENCE' },
        { title: 'Pagina da Live/Webinar', type: 'WEBINAR' },
        { title: 'Replay do Evento', type: 'VIDEO' },
      ]},
      { title: 'Oferta', color: '#ec4899', steps: [
        { title: 'Pagina de Vendas', type: 'SALES_PAGE' },
        { title: 'Checkout', type: 'CHECKOUT' },
        { title: 'Upsell', type: 'UPSELL' },
      ]},
    ],
  },
  {
    id: 'ecommerce',
    title: 'E-commerce',
    description: 'Funil para venda de produto fisico ou digital',
    icon: ShoppingCart,
    color: '#10b981',
    stages: [
      { title: 'Trafego', color: '#f59e0b', steps: [
        { title: 'Anuncio (Meta/Google)', type: 'AD' },
        { title: 'Post Organico', type: 'SOCIAL_POST' },
      ]},
      { title: 'Interesse', color: '#3b82f6', steps: [
        { title: 'Pagina do Produto', type: 'LANDING_PAGE' },
        { title: 'Video de Demonstracao', type: 'VIDEO' },
      ]},
      { title: 'Conversao', color: '#10b981', steps: [
        { title: 'Pagina de Vendas', type: 'SALES_PAGE' },
        { title: 'Checkout', type: 'CHECKOUT' },
        { title: 'Upsell/Cross-sell', type: 'UPSELL' },
      ]},
      { title: 'Retencao', color: '#8b5cf6', steps: [
        { title: 'Email Pos-Compra', type: 'EMAIL_SEQUENCE' },
        { title: 'Programa de Fidelidade', type: 'THANK_YOU' },
      ]},
    ],
  },
  {
    id: 'leads',
    title: 'Geracao de Leads',
    description: 'Funil para captura e nurturing de leads',
    icon: Users,
    color: '#f59e0b',
    stages: [
      { title: 'Atracao', color: '#f59e0b', steps: [
        { title: 'Anuncio/Post', type: 'AD' },
        { title: 'Landing Page com Isca', type: 'LANDING_PAGE' },
        { title: 'Formulario de Captura', type: 'LEAD_CAPTURE' },
      ]},
      { title: 'Nurturing', color: '#3b82f6', steps: [
        { title: 'Sequencia de Emails', type: 'EMAIL_SEQUENCE' },
        { title: 'Conteudo de Valor', type: 'VIDEO' },
      ]},
      { title: 'Qualificacao', color: '#10b981', steps: [
        { title: 'Pagina de Vendas', type: 'SALES_PAGE' },
        { title: 'Agendamento de Reuniao', type: 'OTHER' },
      ]},
    ],
  },
];

export default function NewFunnelPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError('');
    try {
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      const funnel = await api.createFunnel({
        title: title.trim(),
        description: description.trim() || undefined,
        stages: template?.stages || [],
      });
      router.push(`/funnels/${(funnel as any).id}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-page-title mb-1">Novo Funil</h1>
      <p className="text-sm text-text-secondary mb-6">Escolha um template e personalize seu funil</p>

      <form onSubmit={handleCreate}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Nome do Funil</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Lancamento Curso de Marketing"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Descricao</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="Descreva o objetivo do funil..."
                />
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-input bg-red-50 border border-red-100">
                  <p className="text-status-failed text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={saving || !title.trim()} className="w-full btn-cta justify-center">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </span>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    Criar Funil
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Templates */}
          <div className="lg:col-span-7">
            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Template</label>
            <div className="space-y-3">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                const selected = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-white hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: template.color + '20', color: template.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text-primary text-sm">{template.title}</h3>
                          {selected && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              SELECIONADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">{template.description}</p>
                        {template.stages.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {template.stages.map((stage, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: stage.color }}
                              >
                                {stage.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
