'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  ArrowLeft, Plus, Loader2, Trash2, GripVertical, Check, X,
  Pencil, ExternalLink, ArrowRight, ChevronDown, ChevronUp,
  Globe, Mail, ShoppingCart, Video, FileText, Megaphone, Zap, MoreHorizontal,
} from 'lucide-react';

const STEP_TYPE_LABELS: Record<string, string> = {
  LANDING_PAGE: 'Landing Page',
  LEAD_CAPTURE: 'Captura de Lead',
  EMAIL_SEQUENCE: 'Sequencia de Emails',
  SALES_PAGE: 'Pagina de Vendas',
  CHECKOUT: 'Checkout',
  UPSELL: 'Upsell',
  THANK_YOU: 'Obrigado',
  WEBINAR: 'Webinar',
  VIDEO: 'Video',
  SOCIAL_POST: 'Post Social',
  AD: 'Anuncio',
  OTHER: 'Outro',
};

const STEP_TYPE_ICONS: Record<string, any> = {
  LANDING_PAGE: Globe,
  LEAD_CAPTURE: FileText,
  EMAIL_SEQUENCE: Mail,
  SALES_PAGE: ShoppingCart,
  CHECKOUT: ShoppingCart,
  UPSELL: Zap,
  THANK_YOU: Check,
  WEBINAR: Video,
  VIDEO: Video,
  SOCIAL_POST: Megaphone,
  AD: Megaphone,
  OTHER: MoreHorizontal,
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  TODO: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'A Fazer' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Em Andamento' },
  DONE: { bg: 'bg-green-100', text: 'text-green-600', label: 'Concluido' },
};

export default function FunnelBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  // New stage form
  const [addingStage, setAddingStage] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');

  // New step form
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepType, setNewStepType] = useState('OTHER');

  // Editing step
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepData, setEditStepData] = useState<any>({});

  useEffect(() => {
    loadFunnel();
  }, [funnelId]);

  async function loadFunnel() {
    try {
      const data = await api.getFunnel(funnelId);
      setFunnel(data);
      setTitleValue(data.title);
    } catch {
      router.push('/funnels');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTitle() {
    if (!titleValue.trim() || titleValue === funnel.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await api.updateFunnel(funnelId, { title: titleValue.trim() });
      setFunnel((f: any) => ({ ...f, title: titleValue.trim() }));
    } catch {}
    setEditingTitle(false);
  }

  async function handleAddStage() {
    if (!newStageTitle.trim()) return;
    try {
      const stage = await api.addStage(funnelId, { title: newStageTitle.trim(), color: newStageColor });
      setFunnel((f: any) => ({ ...f, stages: [...f.stages, { ...stage, steps: [] }] }));
      setNewStageTitle('');
      setAddingStage(false);
    } catch {}
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('Excluir esta etapa e todos seus passos?')) return;
    try {
      await api.deleteStage(funnelId, stageId);
      setFunnel((f: any) => ({ ...f, stages: f.stages.filter((s: any) => s.id !== stageId) }));
    } catch {}
  }

  async function handleAddStep(stageId: string) {
    if (!newStepTitle.trim()) return;
    try {
      const step = await api.addStep(funnelId, stageId, { title: newStepTitle.trim(), type: newStepType });
      setFunnel((f: any) => ({
        ...f,
        stages: f.stages.map((s: any) =>
          s.id === stageId ? { ...s, steps: [...s.steps, step] } : s,
        ),
      }));
      setNewStepTitle('');
      setNewStepType('OTHER');
      setAddingStepTo(null);
    } catch {}
  }

  async function handleDeleteStep(stageId: string, stepId: string) {
    try {
      await api.deleteStep(funnelId, stageId, stepId);
      setFunnel((f: any) => ({
        ...f,
        stages: f.stages.map((s: any) =>
          s.id === stageId ? { ...s, steps: s.steps.filter((st: any) => st.id !== stepId) } : s,
        ),
      }));
    } catch {}
  }

  async function handleUpdateStep(stageId: string, stepId: string) {
    try {
      const updated = await api.updateStep(funnelId, stageId, stepId, editStepData);
      setFunnel((f: any) => ({
        ...f,
        stages: f.stages.map((s: any) =>
          s.id === stageId
            ? { ...s, steps: s.steps.map((st: any) => (st.id === stepId ? { ...st, ...updated } : st)) }
            : s,
        ),
      }));
      setEditingStep(null);
    } catch {}
  }

  async function handleToggleStepStatus(stageId: string, stepId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'TODO' ? 'IN_PROGRESS' : currentStatus === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    try {
      await api.updateStep(funnelId, stageId, stepId, { status: nextStatus });
      setFunnel((f: any) => ({
        ...f,
        stages: f.stages.map((s: any) =>
          s.id === stageId
            ? { ...s, steps: s.steps.map((st: any) => (st.id === stepId ? { ...st, status: nextStatus } : st)) }
            : s,
        ),
      }));
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!funnel) return null;

  const totalSteps = funnel.stages.reduce((sum: number, s: any) => sum + s.steps.length, 0);
  const doneSteps = funnel.stages.reduce(
    (sum: number, s: any) => sum + s.steps.filter((st: any) => st.status === 'DONE').length, 0,
  );
  const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/funnels" className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="input-field text-lg font-bold py-1"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                autoFocus
              />
              <button onClick={handleUpdateTitle} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleValue(funnel.title); }} className="p-1.5 text-text-muted hover:bg-bg-card-hover rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h1
              className="text-page-title cursor-pointer hover:text-primary transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {funnel.title}
            </h1>
          )}
          {funnel.description && <p className="text-sm text-text-secondary">{funnel.description}</p>}
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted mb-1">{doneSteps}/{totalSteps} passos</div>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent-pink rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {funnel.stages.map((stage: any, stageIdx: number) => {
          const stageSteps = stage.steps || [];
          const stageDone = stageSteps.filter((s: any) => s.status === 'DONE').length;
          const stageProgress = stageSteps.length > 0 ? Math.round((stageDone / stageSteps.length) * 100) : 0;

          return (
            <div key={stage.id} className="flex items-start gap-1">
              <div className="w-72 flex-shrink-0">
                {/* Stage Header */}
                <div className="rounded-t-xl p-3 flex items-center justify-between" style={{ backgroundColor: stage.color + '15' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-semibold text-sm text-text-primary">{stage.title}</h3>
                    <span className="text-xs text-text-muted">({stageSteps.length})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="p-1 rounded text-text-muted hover:text-status-failed hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress */}
                <div className="px-3 py-1.5 bg-white border-x border-border">
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${stageProgress}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="bg-white border-x border-b border-border rounded-b-xl p-2 space-y-2 min-h-[100px]">
                  {stageSteps.map((step: any) => {
                    const StepIcon = STEP_TYPE_ICONS[step.type] || MoreHorizontal;
                    const status = STATUS_COLORS[step.status] || STATUS_COLORS.TODO;
                    const isEditing = editingStep === step.id;

                    if (isEditing) {
                      return (
                        <div key={step.id} className="p-2.5 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                          <input
                            value={editStepData.title || ''}
                            onChange={(e) => setEditStepData({ ...editStepData, title: e.target.value })}
                            className="input-field text-sm py-1.5"
                            placeholder="Titulo"
                          />
                          <textarea
                            value={editStepData.description || ''}
                            onChange={(e) => setEditStepData({ ...editStepData, description: e.target.value })}
                            className="input-field text-xs py-1.5 min-h-[50px]"
                            placeholder="Descricao (opcional)"
                          />
                          <input
                            value={editStepData.link || ''}
                            onChange={(e) => setEditStepData({ ...editStepData, link: e.target.value })}
                            className="input-field text-xs py-1.5"
                            placeholder="Link (opcional)"
                          />
                          <select
                            value={editStepData.type || 'OTHER'}
                            onChange={(e) => setEditStepData({ ...editStepData, type: e.target.value })}
                            className="input-field text-xs py-1.5"
                          >
                            {Object.entries(STEP_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateStep(stage.id, step.id)}
                              className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingStep(null)}
                              className="px-3 py-1.5 text-xs text-text-muted hover:bg-bg-card-hover rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={step.id}
                        className="p-2.5 rounded-lg border border-border bg-bg-main hover:border-primary/20 transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => handleToggleStepStatus(stage.id, step.id, step.status)}
                            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                              step.status === 'DONE'
                                ? 'bg-green-500 border-green-500 text-white'
                                : step.status === 'IN_PROGRESS'
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-gray-300 hover:border-primary'
                            }`}
                          >
                            {step.status === 'DONE' && <Check className="w-3 h-3" />}
                            {step.status === 'IN_PROGRESS' && <ArrowRight className="w-3 h-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.status === 'DONE' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                              {step.title}
                            </p>
                            {step.description && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{step.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted">
                                <StepIcon className="w-3 h-3" />
                                {STEP_TYPE_LABELS[step.type]}
                              </span>
                              {step.link && (
                                <a
                                  href={step.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-dark"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingStep(step.id);
                                setEditStepData({ title: step.title, description: step.description, link: step.link, type: step.type });
                              }}
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteStep(stage.id, step.id)}
                              className="p-1 rounded text-text-muted hover:text-status-failed hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Step */}
                  {addingStepTo === stage.id ? (
                    <div className="p-2.5 rounded-lg border border-dashed border-primary/30 space-y-2">
                      <input
                        value={newStepTitle}
                        onChange={(e) => setNewStepTitle(e.target.value)}
                        className="input-field text-sm py-1.5"
                        placeholder="Nome do passo"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStep(stage.id)}
                      />
                      <select
                        value={newStepType}
                        onChange={(e) => setNewStepType(e.target.value)}
                        className="input-field text-xs py-1.5"
                      >
                        {Object.entries(STEP_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAddStep(stage.id)}
                          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => { setAddingStepTo(null); setNewStepTitle(''); }}
                          className="px-3 py-1.5 text-xs text-text-muted hover:bg-bg-card-hover rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingStepTo(stage.id)}
                      className="w-full p-2 rounded-lg border border-dashed border-border text-xs text-text-muted hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Passo
                    </button>
                  )}
                </div>
              </div>

              {/* Arrow between stages */}
              {stageIdx < funnel.stages.length - 1 && (
                <div className="flex items-center self-center pt-10">
                  <ArrowRight className="w-5 h-5 text-text-muted" />
                </div>
              )}
            </div>
          );
        })}

        {/* Add Stage Column */}
        <div className="w-72 flex-shrink-0">
          {addingStage ? (
            <div className="card p-4 space-y-3">
              <input
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                className="input-field text-sm"
                placeholder="Nome da etapa"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
              />
              <div>
                <label className="block text-xs text-text-muted mb-1">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {STAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newStageColor === color ? 'border-text-primary scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleAddStage} className="flex-1 btn-cta text-sm justify-center">
                  Criar Etapa
                </button>
                <button
                  onClick={() => { setAddingStage(false); setNewStageTitle(''); }}
                  className="btn-ghost text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingStage(true)}
              className="w-full h-32 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary/30 hover:text-primary transition-colors flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Nova Etapa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
