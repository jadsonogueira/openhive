'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Users, Mail, Shield, Trash2, Copy, Check, Plus, Loader2, Crown, UserCog, Eye, Pencil } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietario',
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Visualizador',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

const ROLE_ICONS: Record<string, any> = {
  OWNER: Crown,
  ADMIN: Shield,
  EDITOR: Pencil,
  VIEWER: Eye,
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isOwner = user?.role === 'OWNER' || !user?.role;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [m, i] = await Promise.all([api.listMembers(), api.listInvitations()]);
      setMembers(m);
      setInvitations(i);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await api.createInvitation(inviteEmail, inviteRole);
      setSuccess(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleRemoveMember(id: string, name: string) {
    if (!confirm(`Remover ${name} da equipe?`)) return;
    try {
      await api.removeMember(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpdateRole(id: string, role: string) {
    try {
      await api.updateMemberRole(id, role);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteInvitation(id: string) {
    try {
      await api.deleteInvitation(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title">Equipe</h1>
          <p className="text-sm text-text-secondary mt-1">Gerencie os membros da sua equipe</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowInvite(!showInvite)} className="btn-cta">
            <Plus className="w-4 h-4" />
            Convidar Membro
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-status-failed text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Novo Convite
          </h3>
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input-field"
                placeholder="membro@email.com"
                required
              />
            </div>
            <div className="w-44">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Papel</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="input-field"
              >
                <option value="ADMIN">Administrador</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Visualizador</option>
              </select>
            </div>
            <button type="submit" disabled={sending} className="btn-cta whitespace-nowrap">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Convite'}
            </button>
          </form>
        </div>
      )}

      {/* Members */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membros ({members.length})
        </h3>
        <div className="space-y-3">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role] || Eye;
            return (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-main border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {(member.name || member.email)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{member.name || 'Sem nome'}</p>
                    <p className="text-xs text-text-muted">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'OWNER' ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[member.role]}`}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[member.role]}
                    </span>
                  ) : (
                    <>
                      {isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className="text-xs rounded-lg border border-border px-2 py-1.5 bg-white"
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Visualizador</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[member.role]}`}>
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-failed hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Convites Pendentes ({invitations.filter((i) => !i.usedAt).length})
          </h3>
          <div className="space-y-3">
            {invitations.map((inv) => {
              const expired = new Date(inv.expiresAt) < new Date();
              const used = !!inv.usedAt;
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-main border border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-semibold ${ROLE_COLORS[inv.role]} px-2 py-0.5 rounded-full`}>
                        {ROLE_LABELS[inv.role]}
                      </span>
                      {used ? (
                        <span className="text-xs text-green-600">Aceito</span>
                      ) : expired ? (
                        <span className="text-xs text-status-failed">Expirado</span>
                      ) : (
                        <span className="text-xs text-text-muted">
                          Expira em {Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!used && !expired && (
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar Link
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvitation(inv.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-failed hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
