'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { ArrowLeft, Loader2, Film, Sparkles, Youtube } from 'lucide-react';

export default function NewClipPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res: any = await api.analyzeVideo({ url: url.trim() });
      const id = res.data?.id || res.id;
      router.push(`/clips/${id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar analise');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clips" className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-page-title">Novo Clip</h1>
          <p className="text-sm text-text-secondary">
            Cole a URL de um video do YouTube para extrair os melhores momentos
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1.5">URL do YouTube</label>
          <div className="relative">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-field pl-10"
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-sm text-status-failed">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!url.trim() || loading}
          className="btn-cta w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando video...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analisar Video
            </>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="mt-6 card p-5">
        <h3 className="font-semibold text-sm text-text-primary mb-3 flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          Como funciona
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-bg-main">
            <div className="text-lg font-bold text-primary mb-1">1</div>
            <p className="text-xs text-text-secondary">A IA baixa e transcreve o video automaticamente</p>
          </div>
          <div className="p-3 rounded-lg bg-bg-main">
            <div className="text-lg font-bold text-primary mb-1">2</div>
            <p className="text-xs text-text-secondary">Os melhores momentos sao identificados por scoring</p>
          </div>
          <div className="p-3 rounded-lg bg-bg-main">
            <div className="text-lg font-bold text-primary mb-1">3</div>
            <p className="text-xs text-text-secondary">Voce escolhe quais momentos quer transformar em clips</p>
          </div>
          <div className="p-3 rounded-lg bg-bg-main">
            <div className="text-lg font-bold text-primary mb-1">4</div>
            <p className="text-xs text-text-secondary">Clips verticais (9:16) com face cam e legendas automaticas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
