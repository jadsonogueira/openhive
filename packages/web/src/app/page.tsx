'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Plus,
  FileText,
  Edit3,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Settings,
  Instagram,
  Heart,
  MessageCircle,
  Users,
  UserPlus,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';

interface Stats {
  total: number;
  draft: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface IGProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  website: string;
}

interface IGMedia {
  id: string;
  caption: string;
  media_type: string;
  media_url: string | null;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

const METRIC_CARDS = [
  {
    key: 'total',
    label: 'TOTAL POSTS',
    icon: FileText,
    accent: 'from-primary to-accent-pink',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    key: 'draft',
    label: 'RASCUNHOS',
    icon: Edit3,
    accent: 'from-status-draft to-status-draft',
    iconBg: 'bg-gray-100',
    iconColor: 'text-status-draft',
  },
  {
    key: 'scheduled',
    label: 'AGENDADOS',
    icon: Clock,
    accent: 'from-status-scheduled to-status-scheduled',
    iconBg: 'bg-blue-50',
    iconColor: 'text-status-scheduled',
  },
  {
    key: 'published',
    label: 'PUBLICADOS',
    icon: CheckCircle,
    accent: 'from-status-published to-status-published',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-status-published',
  },
  {
    key: 'failed',
    label: 'FALHAS',
    icon: AlertCircle,
    accent: 'from-status-failed to-status-failed',
    iconBg: 'bg-red-50',
    iconColor: 'text-status-failed',
  },
];

function formatNumber(n?: number): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, scheduled: 0, published: 0, failed: 0 });
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [igProfile, setIgProfile] = useState<IGProfile | null>(null);
  const [igMedia, setIgMedia] = useState<IGMedia[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [all, drafts, scheduled, published, failed] = await Promise.all([
          api.listPosts({ limit: '1' }),
          api.listPosts({ status: 'DRAFT', limit: '1' }),
          api.listPosts({ status: 'SCHEDULED', limit: '5' }),
          api.listPosts({ status: 'PUBLISHED', limit: '5' }),
          api.listPosts({ status: 'FAILED', limit: '1' }),
        ]);
        setStats({
          total: all.total,
          draft: drafts.total,
          scheduled: scheduled.total,
          published: published.total,
          failed: failed.total,
        });
        setUpcomingPosts(scheduled.items);
        setRecentPosts(published.items);
      } catch { /* API down or not logged in */ }

      // Load Instagram data
      try {
        const ig = await api.instagramProfile();
        setIgProfile(ig.profile);
        setIgMedia(ig.recentMedia);
      } catch { /* Instagram not configured */ }
    }
    load();
  }, []);

  const totalEngagement = igMedia.reduce((sum, m) => sum + (m.like_count ?? 0) + (m.comments_count ?? 0), 0);
  const avgEngagement = igMedia.length > 0 ? Math.round(totalEngagement / igMedia.length) : 0;
  const totalLikes = igMedia.reduce((sum, m) => sum + (m.like_count ?? 0), 0);
  const totalComments = igMedia.reduce((sum, m) => sum + (m.comments_count ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-page-title text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Visao geral dos seus posts</p>
        </div>
        <Link href="/posts/new" className="btn-cta">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Post
        </Link>
      </div>

      {/* Instagram Account Card */}
      {igProfile && (
        <div className="card p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]" />
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Info */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737]">
                  <img
                    src={igProfile.profile_picture_url}
                    alt={igProfile.username}
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">{igProfile.name}</h2>
                  <Instagram className="w-4 h-4 text-[#E1306C]" />
                </div>
                <p className="text-sm text-text-secondary">@{igProfile.username}</p>
                {igProfile.biography && (
                  <p className="text-xs text-text-muted mt-1 max-w-xs truncate">{igProfile.biography}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 lg:gap-10 lg:ml-auto">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{formatNumber(igProfile.followers_count)}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <Users className="w-3 h-3" /> Seguidores
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{formatNumber(igProfile.follows_count)}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <UserPlus className="w-3 h-3" /> Seguindo
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{igProfile.media_count}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <ImageIcon className="w-3 h-3" /> Posts
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{formatNumber(totalLikes)}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <Heart className="w-3 h-3" /> Curtidas
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{formatNumber(totalComments)}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <MessageCircle className="w-3 h-3" /> Comentarios
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{avgEngagement}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 justify-center">
                  <Heart className="w-3 h-3" /> Eng. Medio
                </p>
              </div>
              {igProfile.website && (
                <a
                  href={igProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Website
                </a>
              )}
            </div>
          </div>

          {/* Recent Instagram Posts Grid */}
          {igMedia.length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#F0EFEC]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Posts Recentes no Instagram</p>
                <a
                  href={`https://instagram.com/${igProfile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  Ver perfil <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {igMedia.slice(0, 6).map((media) => (
                  <a
                    key={media.id}
                    href={media.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden bg-bg-main"
                  >
                    {media.media_url ? (
                      <img
                        src={media.media_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-card">
                        <ImageIcon className="w-8 h-8 text-text-muted" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-3 text-white text-xs font-semibold">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" fill="white" /> {media.like_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" fill="white" /> {media.comments_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof Stats];
          return (
            <div key={card.key} className="card p-5 relative overflow-hidden group hover:-translate-y-0.5">
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accent}`} />
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.5} />
              </div>
              <p className="text-card-number text-text-primary">{value}</p>
              <p className="text-card-label text-text-secondary uppercase tracking-wider mt-1">{card.label}</p>
            </div>
          );
        })}
        {/* Instagram engagement cards */}
        <div className="card p-5 relative overflow-hidden group hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E1306C] to-[#F77737]" />
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mb-3">
            <Heart className="w-5 h-5 text-[#E1306C]" strokeWidth={1.5} />
          </div>
          <p className="text-card-number text-text-primary">{formatNumber(totalLikes)}</p>
          <p className="text-card-label text-text-secondary uppercase tracking-wider mt-1">CURTIDAS IG</p>
        </div>
        <div className="card p-5 relative overflow-hidden group hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#833AB4] to-[#E1306C]" />
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <MessageCircle className="w-5 h-5 text-[#833AB4]" strokeWidth={1.5} />
          </div>
          <p className="text-card-number text-text-primary">{formatNumber(totalComments)}</p>
          <p className="text-card-label text-text-secondary uppercase tracking-wider mt-1">COMENTARIOS IG</p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Upcoming Scheduled */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-status-scheduled" strokeWidth={1.5} />
              </div>
              <h2 className="text-section-title text-text-primary">Proximos Agendados</h2>
            </div>
            <Link href="/calendar" className="text-[13px] text-primary hover:text-primary-dark font-medium hover:underline transition-colors">
              Ver calendario
            </Link>
          </div>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-text-muted">Nenhum post agendado</p>
              <Link href="/posts/new" className="text-xs text-primary hover:underline mt-2 inline-block font-medium">
                Agendar um post
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EFEC]">
              {upcomingPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 py-3 px-1 hover:bg-bg-card-hover rounded-lg transition-colors -mx-1">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-thumb object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-thumb bg-bg-main flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{post.caption || 'Sem legenda'}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-BR') : 'Sem data'}
                    </p>
                  </div>
                  <span className="badge badge-scheduled">SCHEDULED</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Published */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-status-published" strokeWidth={1.5} />
              </div>
              <h2 className="text-section-title text-text-primary">Publicados Recentes</h2>
            </div>
            <Link href="/posts" className="text-[13px] text-primary hover:text-primary-dark font-medium hover:underline transition-colors">
              Ver todos
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-text-muted mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-text-muted">Nenhum post publicado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EFEC]">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 py-3 px-1 hover:bg-bg-card-hover rounded-lg transition-colors -mx-1">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-thumb object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-thumb bg-bg-main flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{post.caption || 'Sem legenda'}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="badge badge-published">PUBLISHED</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-section-title text-text-primary mb-4">Acoes Rapidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/posts/new" className="card p-5 border border-border hover:border-primary hover:-translate-y-0.5 group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent-pink/10 group-hover:from-primary/20 group-hover:to-accent-pink/20 transition-colors">
                <Plus className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-text-primary">Criar Post</p>
                <p className="text-[13px] text-text-secondary">Gerar imagem e legenda com IA</p>
              </div>
            </div>
          </Link>
          <Link href="/calendar" className="card p-5 border border-border hover:border-primary hover:-translate-y-0.5 group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Calendar className="w-5 h-5 text-status-scheduled" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-text-primary">Calendario</p>
                <p className="text-[13px] text-text-secondary">Ver agenda de publicacoes</p>
              </div>
            </div>
          </Link>
          <Link href="/settings" className="card p-5 border border-border hover:border-primary hover:-translate-y-0.5 group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
                <Settings className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-text-primary">Configuracoes</p>
                <p className="text-[13px] text-text-secondary">Instagram, Bot e API</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
