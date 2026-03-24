'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, setToken } from '../../lib/api';
import { Zap, Loader2, CheckCircle, XCircle } from 'lucide-react';

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link de convite invalido');
      setLoading(false);
      return;
    }
    api.getInvitationByToken(token)
      .then(setInvite)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.acceptInvitation(token!, name, password);
      setToken(result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setDone(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Conta criada com sucesso!</h2>
          <p className="text-text-secondary">Redirecionando...</p>
        </div>
      </div>
    );
  }

  if (!invite || invite.expired || invite.used) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center max-w-md mx-4">
          <XCircle className="w-16 h-16 text-status-failed mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {invite?.used ? 'Convite ja utilizado' : invite?.expired ? 'Convite expirado' : 'Convite invalido'}
          </h2>
          <p className="text-text-secondary">
            {error || 'Este link de convite nao e mais valido. Solicite um novo convite ao administrador.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main relative">
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-accent-pink/10 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent-pink shadow-cta">
            <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Insta<span className="bg-gradient-to-r from-primary to-accent-pink bg-clip-text text-transparent">Post</span>
            </h1>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-[0.1em]">AI Platform</span>
          </div>
        </div>

        <div className="bg-white rounded-card p-8 shadow-lg border border-border">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">Voce foi convidado!</h2>
            <p className="text-sm text-text-secondary mt-1">
              <span className="font-semibold text-primary">{invite.ownerName}</span> convidou voce como{' '}
              <span className="font-semibold">{invite.role === 'ADMIN' ? 'Administrador' : invite.role === 'EDITOR' ? 'Editor' : 'Visualizador'}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">Email: {invite.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Seu Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Como quer ser chamado"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Confirmar Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Repita a senha"
                required
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-input bg-red-50 border border-red-100">
                <p className="text-status-failed text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} className="w-full btn-cta justify-center py-3">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando conta...
                </span>
              ) : 'Criar Conta e Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
