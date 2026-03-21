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
  TrendingUp,
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

  const totalLikes = igMedia.reduce((sum, m) => sum + (m.like_count ?? 0), 0);
  const totalComments = igMedia.reduce((sum, m) => sum + (m.comments_count ?? 0), 0);
  const avgEngagement = igMedia.length > 0 ? Math.round((totalLikes + totalComments) / igMedia.length) : 0;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Visao geral dos seus posts</p>
        </div>
        <Link href="/posts/new" className="btn-cta">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Novo Post
        </Link>
      </div>

      {/* Metric Cards - Post stats only */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { key: 'total', label: 'TOTAL POSTS', icon: FileText, accent: 'from-primary to-accent-pink', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
          { key: 'draft', label: 'RASCUNHOS', icon: Edit3, accent: 'from-status-draft to-status-draft', iconBg: 'bg-gray-100', iconColor: 'text-status-draft' },
          { key: 'scheduled', label: 'AGENDADOS', icon: Clock, accent: 'from-status-scheduled to-status-scheduled', iconBg: 'bg-blue-50', iconColor: 'text-status-scheduled' },
          { key: 'published', label: 'PUBLICADOS', icon: CheckCircle, accent: 'from-status-published to-status-published', iconBg: 'bg-emerald-50', iconColor: 'text-status-published' },
          { key: 'failed', label: 'FALHAS', icon: AlertCircle, accent: 'from-status-failed to-status-failed', iconBg: 'bg-red-50', iconColor: 'text-status-failed' },
        ].map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof Stats];
          return (
            <div key={card.key} className="card p-5 relative overflow-hidden group hover:-translate-y-0.5">
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accent}`} />
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.5} />
              </div>
              <p className="text-card-number text-text-primary">{value}</p>
              <p className="text-card-label text-text-secondary uppercase tracking-wider mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
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

      {/* Instagram Profile + Recent Media */}
      {igProfile && (
        <div className="card p-6 mb-6">
          {/* Profile Row */}
          <div className="flex items-center gap-4 mb-5">
            {igProfile.profile_picture_url ? (
              <img src={igProfile.profile_picture_url} alt={igProfile.username} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center">
                <Instagram className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-section-title text-text-primary">@{igProfile.username}</h2>
                {igProfile.website && (
                  <a href={igProfile.website} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                )}
              </div>
              {igProfile.name && <p className="text-xs text-text-secondary truncate">{igProfile.name}</p>}
            </div>
            <div className="hidden sm:flex items-center gap-5 text-center">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-bold text-text-primary">{formatNumber(igProfile.followers_count)}</span>
                <span className="text-[11px] text-text-secondary">Seguidores</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-bold text-text-primary">{formatNumber(igProfile.follows_count)}</span>
                <span className="text-[11px] text-text-secondary">Seguindo</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-bold text-text-primary">{formatNumber(igProfile.media_count)}</span>
                <span className="text-[11px] text-text-secondary">Posts</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-500" strokeWidth={1.5} />
                <span className="text-sm font-bold text-pink-600">{formatNumber(totalLikes)}</span>
                <span className="text-[11px] text-text-secondary">Curtidas</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
                <span className="text-sm font-bold text-purple-600">{formatNumber(totalComments)}</span>
                <span className="text-[11px] text-text-secondary">Comentarios</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-bold text-text-primary">{formatNumber(avgEngagement)}</span>
                <span className="text-[11px] text-text-secondary">Eng. Medio</span>
              </div>
            </div>
          </div>

          {/* Media Grid */}
          {igMedia.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {igMedia.slice(0, 6).map((media) => (
                <a key={media.id} href={media.permalink} target="_blank" rel="noopener noreferrer" className="group relative aspect-square rounded-lg overflow-hidden bg-bg-main">
                  {media.media_url ? (
                    <img src={media.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-text-muted" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-3 text-white text-xs font-medium">
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{media.like_count ?? 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{media.comments_count ?? 0}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
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
  );
}
