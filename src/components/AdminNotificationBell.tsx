"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Calendar, 
  Star, 
  Sparkles, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  X, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export interface NotificationItem {
  id: string;
  type: 'APPOINTMENT' | 'FEEDBACK' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  badgeText?: string;
}

// Melodia de Notificação agradável e nítida gerada via Web Audio API (duração de ~3.5 segundos)
export function playAppointmentChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Melodia de campainha suave de alta qualidade (~3.5 segundos)
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },  // Dó 5
      { freq: 659.25, time: 0.35, dur: 0.4 }, // Mi 5
      { freq: 783.99, time: 0.7, dur: 0.4 },  // Sol 5
      { freq: 1046.50, time: 1.05, dur: 0.8 },// Dó 6
      // Segundo acorde de eco
      { freq: 659.25, time: 2.0, dur: 0.35 }, // Mi 5
      { freq: 783.99, time: 2.35, dur: 0.35 },// Sol 5
      { freq: 1046.50, time: 2.7, dur: 0.8 }, // Dó 6
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

      gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + note.time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.dur);
    });

    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 3600);
  } catch (err) {
    console.warn("Aviso ao reproduzir som de notificação:", err);
  }
}

export function AdminNotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const knownAppointmentIds = useRef<Set<string>>(new Set());
  const knownFeedbackIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carrega agendamentos e feedbacks recentes
  useEffect(() => {
    const SYSTEM_NOTIFICATIONS: NotificationItem[] = [
      {
        id: 'sys-update-3',
        type: 'SYSTEM',
        title: '🚀 Nova Central de Notificações com Alerta Sonoro',
        description: 'Agora o sistema emite um sinal sonoro de 3.5s a cada novo agendamento e avisa sobre avaliações e atualizações!',
        timestamp: new Date(),
        read: false,
        badgeText: 'Novidade v1.4'
      },
      {
        id: 'sys-update-2',
        type: 'SYSTEM',
        title: '🏢 Cadastro de Empresas (PJ) e Frotas Liberado',
        description: 'Na aba de Clientes, agora é possível cadastrar empresas parceiras com CNPJ, responsável e placas da frota.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: false,
        link: '/admin/clientes',
        badgeText: 'Recurso PJ'
      },
      {
        id: 'sys-update-1',
        type: 'SYSTEM',
        title: '💰 Módulo Financeiro & Relatórios',
        description: 'Gere relatórios de faturamento semanal, mensal e anual, com gráficos e exportação para Excel.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        read: false,
        link: '/admin/financeiro',
        badgeText: 'Financeiro'
      }
    ];

    async function loadInitialData() {
      try {
        // 1. Busca os últimos agendamentos
        const { data: recentAppointments } = await supabase
          .from('appointments')
          .select('id, customer_name, customer_phone, vehicle_plate, scheduled_at, total_price, status, created_at, services(name)')
          .order('created_at', { ascending: false })
          .limit(10);

        const appointmentNotifications: NotificationItem[] = [];
        if (recentAppointments) {
          recentAppointments.forEach(app => {
            knownAppointmentIds.current.add(app.id);
            const serviceName = (app.services as unknown as { name: string })?.name || 'Lavagem';
            const scheduledDate = new Date(app.scheduled_at);
            const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = scheduledDate.toLocaleDateString('pt-BR');

            appointmentNotifications.push({
              id: `app-${app.id}`,
              type: 'APPOINTMENT',
              title: `🚗 Novo Agendamento: ${app.customer_name}`,
              description: `${serviceName} • ${dateStr} às ${timeStr} • R$ ${Number(app.total_price).toFixed(2)} (${app.vehicle_plate || 'Sem placa'})`,
              timestamp: new Date(app.created_at || app.scheduled_at),
              read: app.status === 'FINALIZADO' || app.status === 'CANCELADO',
              link: '/admin/agendamentos',
              badgeText: app.status
            });
          });
        }

        // 2. Busca feedbacks recentes (se a tabela existir)
        const feedbackNotifications: NotificationItem[] = [];
        try {
          const { data: recentFeedbacks } = await supabase
            .from('feedbacks')
            .select('id, customer_name, comment, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          if (recentFeedbacks) {
            recentFeedbacks.forEach(fb => {
              knownFeedbackIds.current.add(fb.id);
              feedbackNotifications.push({
                id: `fb-${fb.id}`,
                type: 'FEEDBACK',
                title: `⭐ Nova Avaliação (${fb.rating}/5 estrelas)`,
                description: `"${fb.comment.slice(0, 100)}${fb.comment.length > 100 ? '...' : ''}" — ${fb.customer_name || 'Cliente'}`,
                timestamp: new Date(fb.created_at),
                read: false,
                badgeText: `${fb.rating} ⭐`
              });
            });
          }
        } catch {
          // Ignora se a tabela ainda não estiver populada
        }

        // Combina e ordena todas
        const merged = [...appointmentNotifications, ...feedbackNotifications, ...SYSTEM_NOTIFICATIONS].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        setNotifications(merged);
        isInitialLoad.current = false;
      } catch (err) {
        console.warn("Erro ao carregar notificações:", err);
      }
    }

    loadInitialData();

    // 3. Polling em tempo real a cada 10 segundos para novos agendamentos e feedbacks
    const interval = setInterval(async () => {
      try {
        const { data: latestAppointments } = await supabase
          .from('appointments')
          .select('id, customer_name, customer_phone, vehicle_plate, scheduled_at, total_price, status, created_at, services(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (latestAppointments && !isInitialLoad.current) {
          latestAppointments.forEach(app => {
            if (!knownAppointmentIds.current.has(app.id)) {
              knownAppointmentIds.current.add(app.id);

              const serviceName = (app.services as unknown as { name: string })?.name || 'Lavagem';
              const scheduledDate = new Date(app.scheduled_at);
              const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const dateStr = scheduledDate.toLocaleDateString('pt-BR');

              const newNotif: NotificationItem = {
                id: `app-${app.id}`,
                type: 'APPOINTMENT',
                title: `🚗 Novo Agendamento: ${app.customer_name}`,
                description: `${serviceName} • ${dateStr} às ${timeStr} • R$ ${Number(app.total_price).toFixed(2)} (${app.vehicle_plate || 'Sem placa'})`,
                timestamp: new Date(),
                read: false,
                link: '/admin/agendamentos',
                badgeText: 'NOVO'
              };

              // Toca som se ativado (3.5 segundos)
              if (soundEnabled) {
                playAppointmentChime();
              }

              // Exibe Toast na tela por 6 segundos
              setActiveToast(newNotif);
              setTimeout(() => setActiveToast(null), 6000);

              setNotifications(prev => [newNotif, ...prev]);
            }
          });
        }

        // Checa novos feedbacks
        try {
          const { data: latestFeedbacks } = await supabase
            .from('feedbacks')
            .select('id, customer_name, comment, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

          if (latestFeedbacks && !isInitialLoad.current) {
            latestFeedbacks.forEach(fb => {
              if (!knownFeedbackIds.current.has(fb.id)) {
                knownFeedbackIds.current.add(fb.id);

                const newNotif: NotificationItem = {
                  id: `fb-${fb.id}`,
                  type: 'FEEDBACK',
                  title: `⭐ Nova Avaliação (${fb.rating}/5 estrelas)`,
                  description: `"${fb.comment.slice(0, 100)}${fb.comment.length > 100 ? '...' : ''}" — ${fb.customer_name || 'Cliente'}`,
                  timestamp: new Date(),
                  read: false,
                  badgeText: `${fb.rating} ⭐`
                };

                setActiveToast(newNotif);
                setTimeout(() => setActiveToast(null), 6000);

                setNotifications(prev => [newNotif, ...prev]);
              }
            });
          }
        } catch {
          // Ignora se tabela de feedbacks não existir
        }
      } catch (err) {
        console.warn("Erro no polling de notificações:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [soundEnabled]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sino com Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
        title="Central de Notificações"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-amber-500 dark:text-amber-400 animate-bounce' : ''}`} />
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[10px] font-black text-white items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header do Dropdown */}
          <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/70">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Notificações
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {unreadCount} novas
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botão de Testar/Alternar Som */}
              <button
                type="button"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) {
                    playAppointmentChime();
                  }
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  soundEnabled 
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40' 
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={soundEnabled ? "Som ativado (clique para testar ou desativar)" : "Som desativado (clique para ativar)"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Marcar todas como lidas */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">
                Nenhuma notificação no momento.
              </div>
            ) : (
              notifications.map((n) => {
                const isApp = n.type === 'APPOINTMENT';
                const isFb = n.type === 'FEEDBACK';
                const isSys = n.type === 'SYSTEM';

                return (
                  <div
                    key={n.id}
                    onClick={() => markSingleAsRead(n.id)}
                    className={`p-3.5 transition-colors text-left relative ${
                      !n.read 
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isApp 
                          ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' 
                          : isFb 
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                          : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      }`}>
                        {isApp && <Calendar size={16} />}
                        {isFb && <Star size={16} className="fill-current" />}
                        {isSys && <Sparkles size={16} />}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs font-bold truncate ${
                            !n.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed break-words">
                          {n.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/60 dark:border-gray-800/40">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} />
                            {n.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => setIsOpen(false)}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              Ver detalhes <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer do Popover */}
          <div className="p-2.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">
              🔊 Som: {soundEnabled ? 'Ativado (3.5s)' : 'Desativado'}
            </span>
            <button
              type="button"
              onClick={playAppointmentChime}
              className="font-bold text-green-600 dark:text-green-400 hover:underline"
            >
              Testar Som 🔔
            </button>
          </div>
        </div>
      )}

      {/* Banner Toast Flutuante em Tempo Real */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-gray-900 border-2 border-green-500 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2 rounded-xl bg-green-500/10 text-green-500 shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-green-500 text-neutral-950 font-black text-[9px] uppercase tracking-wider animate-pulse">
                  🔔 Novo Agendamento!
                </span>
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                {activeToast.description}
              </p>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
