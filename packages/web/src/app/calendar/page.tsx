'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Inbox,
  Instagram,
  BarChart2,
} from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-status-draft',
  SCHEDULED: 'bg-status-scheduled',
  PUBLISHED: 'bg-status-published',
  FAILED: 'bg-status-failed',
};

const STATUS_EVENT: Record<string, string> = {
  DRAFT: 'cal-event-draft',
  SCHEDULED: 'cal-event-scheduled',
  PUBLISHED: 'cal-event-published',
  FAILED: 'cal-event-failed',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
  FAILED: 'Falha',
};

export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  useEffect(() => {
    async function load() {
      try {
        const result = await api.listPosts({ limit: '200' });
        setPosts(result.items);
      } catch { /* ignore */ }
    }
    load();
  }, []);

  function getPostsForDay(day: number) {
    return posts.filter((p) => {
      const d = new Date(p.scheduledAt || p.createdAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedDay(today.getDate());
  }

  // Stats for the month
  const monthStats = posts.reduce(
    (acc, p) => {
      const d = new Date(p.scheduledAt || p.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (p.status === 'PUBLISHED') acc.published++;
        else if (p.status === 'SCHEDULED') acc.scheduled++;
        else if (p.status === 'DRAFT') acc.draft++;
        else if (p.status === 'FAILED') acc.failed++;
        acc.total++;
      }
      return acc;
    },
    { published: 0, scheduled: 0, draft: 0, failed: 0, total: 0 }
  );

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];
  const selectedDayOfWeek = selectedDay ? new Date(year, month, selectedDay).getDay() : 0;

  // Total cells needed (fill rows of 7)
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-page-title text-text-primary tracking-tight">Calendario</h1>
          <p className="text-sm text-text-secondary font-medium mt-1">Visualize e gerencie a programacao dos seus posts</p>
        </div>
        <Link href="/posts/new" className="btn-cta">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Agendar Post
        </Link>
      </header>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Calendar Main */}
        <div className="flex-1 flex flex-col">
          <div className="card overflow-hidden border border-border">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-card-hover/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCurrentDate(new Date(year, month - 1)); setSelectedDay(null); }}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors shadow-sm bg-white"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => { setCurrentDate(new Date(year, month + 1)); setSelectedDay(null); }}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors shadow-sm bg-white"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2} />
                </button>
                <h2 className="text-lg font-bold text-text-primary tracking-tight ml-2">
                  {MONTHS[month]} {year}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={goToToday}
                  className="text-[13px] font-semibold text-text-primary border border-border px-4 py-2 rounded-lg hover:bg-bg-card-hover transition-colors shadow-sm bg-white"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-bg-card-hover text-[12px] font-bold text-text-secondary text-center py-3 uppercase tracking-wider">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayOffset = i - firstDayOfWeek;
                const day = dayOffset + 1;
                const isOutside = day < 1 || day > daysInMonth;
                const displayDay = isOutside
                  ? day < 1
                    ? prevMonthDays + day
                    : day - daysInMonth
                  : day;
                const isToday = !isOutside && isCurrentMonth && today.getDate() === day;
                const isSelected = !isOutside && selectedDay === day;
                const dayPosts = isOutside ? [] : getPostsForDay(day);

                return (
                  <div
                    key={i}
                    onClick={() => !isOutside && setSelectedDay(isSelected ? null : day)}
                    className={`calendar-cell ${isOutside ? 'outside' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    <span
                      className={`text-[13px] font-medium inline-block w-7 h-7 text-center leading-7 rounded-full ${
                        isToday
                          ? 'bg-primary text-white font-bold shadow-sm'
                          : isOutside
                            ? 'text-text-muted'
                            : 'text-text-primary group-hover:text-primary'
                      }`}
                    >
                      {displayDay}
                    </span>
                    {dayPosts.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        {dayPosts.slice(0, 3).map((p) => (
                          <div key={p.id} className={`cal-event ${STATUS_EVENT[p.status] || 'cal-event-draft'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status] || 'bg-gray-400'}`} />
                            <span className="truncate">
                              {p.scheduledAt && new Date(p.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                              {(p.caption || 'Sem legenda').slice(0, 20)}
                            </span>
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <span className="text-[10px] text-text-muted font-medium pl-1">+{dayPosts.length - 3} mais</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-5 px-2">
            {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
              <div key={status} className="flex items-center gap-2 text-[12px] font-medium text-text-secondary">
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                {STATUS_LABEL[status]}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full xl:w-[320px] flex flex-col gap-6">
          {/* Selected Day Info */}
          <div className="card p-6 border border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent-pink" />
            {selectedDay ? (
              <>
                <h3 className="text-lg font-bold text-text-primary tracking-tight mb-0.5">
                  {selectedDay} de {MONTHS[month]}, {WEEKDAY_SHORT[selectedDayOfWeek]}
                </h3>
                <p className="text-[13px] text-text-secondary font-medium mb-5">
                  {selectedDayPosts.length === 0
                    ? 'Nenhum post neste dia'
                    : `${selectedDayPosts.length} Post${selectedDayPosts.length > 1 ? 's' : ''}`}
                </p>

                {selectedDayPosts.length === 0 ? (
                  <div className="text-center py-6">
                    <Inbox className="w-10 h-10 text-text-muted mx-auto mb-2" strokeWidth={1} />
                    <p className="text-sm text-text-muted">Dia livre</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {selectedDayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-xl border border-border bg-bg-card-hover hover:border-primary/30 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`badge ${
                            post.status === 'SCHEDULED' ? 'badge-scheduled'
                            : post.status === 'PUBLISHED' ? 'badge-published'
                            : post.status === 'FAILED' ? 'badge-failed'
                            : 'badge-draft'
                          }`}>
                            {post.scheduledAt
                              ? new Date(post.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                              : STATUS_LABEL[post.status] || post.status}
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          {post.mediaType === 'VIDEO' && post.videoUrl ? (
                            <video src={post.videoUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-black" muted playsInline />
                          ) : post.mediaType === 'VIDEO' ? (
                            <div className="w-10 h-10 rounded-lg bg-bg-main flex items-center justify-center flex-shrink-0 border border-border">
                              <span className="text-[8px] font-bold text-primary">REEL</span>
                            </div>
                          ) : post.imageUrl && (
                            <img src={post.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-semibold text-text-primary leading-tight mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
                              {post.caption || 'Sem legenda'}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                              <Instagram className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {post.source || 'Instagram Feed'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  href="/posts/new"
                  className="w-full mt-4 py-2.5 rounded-lg border border-dashed border-border text-text-secondary text-[13px] font-semibold hover:bg-bg-card-hover hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Adicionar neste dia
                </Link>
              </>
            ) : (
              <div className="text-center py-10">
                <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" strokeWidth={1} />
                <h3 className="text-base font-bold text-text-primary mb-1">Selecione um dia</h3>
                <p className="text-sm text-text-muted">Clique em um dia do calendario para ver os detalhes</p>
              </div>
            )}
          </div>

          {/* Mini Stats Widget */}
          <div className="card p-5 border border-border">
            <h3 className="text-[14px] font-bold text-text-primary mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" strokeWidth={2} />
              Resumo do Mes
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-text-secondary font-medium">Publicados</span>
                  <span className="font-bold text-text-primary">{monthStats.published}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-status-published h-1.5 rounded-full transition-all duration-500"
                    style={{ width: monthStats.total ? `${(monthStats.published / monthStats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-text-secondary font-medium">Agendados</span>
                  <span className="font-bold text-text-primary">{monthStats.scheduled}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-status-scheduled h-1.5 rounded-full transition-all duration-500"
                    style={{ width: monthStats.total ? `${(monthStats.scheduled / monthStats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-text-secondary font-medium">Rascunhos</span>
                  <span className="font-bold text-text-primary">{monthStats.draft}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-status-draft h-1.5 rounded-full transition-all duration-500"
                    style={{ width: monthStats.total ? `${(monthStats.draft / monthStats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
