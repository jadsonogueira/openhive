'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { GitBranch, Plus, Loader2, Trash2, ArrowRight } from 'lucide-react';

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listFunnels()
      .then(setFunnels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir o funil "${title}"?`)) return;
    try {
      await api.deleteFunnel(id);
      setFunnels((prev) => prev.filter((f) => f.id !== id));
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title">Funis de Vendas</h1>
          <p className="text-sm text-text-secondary mt-1">Monte e gerencie seus funis de vendas</p>
        </div>
        <Link href="/funnels/new" className="btn-cta">
          <Plus className="w-4 h-4" />
          Novo Funil
        </Link>
      </div>

      {funnels.length === 0 ? (
        <div className="card p-12 text-center">
          <GitBranch className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text-primary mb-1">Nenhum funil criado</h3>
          <p className="text-sm text-text-secondary mb-4">Crie seu primeiro funil de vendas para organizar sua estrategia</p>
          <Link href="/funnels/new" className="btn-cta inline-flex">
            <Plus className="w-4 h-4" />
            Criar Funil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {funnels.map((funnel) => {
            const totalSteps = funnel.stages?.reduce((sum: number, s: any) => sum + (s._count?.steps || 0), 0) || 0;
            return (
              <div key={funnel.id} className="card p-5 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">{funnel.title}</h3>
                    {funnel.description && (
                      <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{funnel.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(funnel.id, funnel.title)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-status-failed hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stages preview */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                  {funnel.stages?.map((stage: any, idx: number) => (
                    <div key={stage.id} className="flex items-center">
                      <div
                        className="px-2.5 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.title}
                      </div>
                      {idx < funnel.stages.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-text-muted mx-0.5 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {(!funnel.stages || funnel.stages.length === 0) && (
                    <span className="text-xs text-text-muted">Nenhuma etapa</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{funnel.stages?.length || 0} etapas</span>
                    <span>{totalSteps} passos</span>
                  </div>
                  <Link
                    href={`/funnels/${funnel.id}`}
                    className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    Abrir Builder
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
