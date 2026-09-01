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
  ExternalLink,
  Flame
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export type SoundType = 'SIREN' | 'IFOOD' | 'CHIME';

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

// 1. SIRENE DE ALARME DE ALTA ATENÇÃO (Pulsante e Estridente - ~4.0 segundos)
export function playSirenAlert() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime;
    const totalDuration = 4.0; // 4 segundos de sirene enérgica

    // Oscilador 1: Onda Sawtooth com filtro para dar o efeito de sirene de emergência
    const osc1 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();

    osc1.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);

    // Modulação de frequência: Sirene subindo e descendo por 4 ciclos em 4 segundos
    const cycles = 4;
    const cycleDuration = totalDuration / cycles;
    for (let i = 0; i < cycles; i++) {
      const cycleStart = startTime + (i * cycleDuration);
      const cycleMid = cycleStart + (cycleDuration * 0.5);
      const cycleEnd = cycleStart + cycleDuration;

      osc1.frequency.setValueAtTime(650, cycleStart);
      osc1.frequency.linearRampToValueAtTime(1380, cycleMid);
      osc1.frequency.linearRampToValueAtTime(650, cycleEnd);
    }

    gain1.gain.setValueAtTime(0, startTime);
    gain1.gain.linearRampToValueAtTime(0.35, startTime + 0.08);
    gain1.gain.setValueAtTime(0.35, startTime + totalDuration - 0.2);
    gain1.gain.linearRampToValueAtTime(0.001, startTime + totalDuration);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(startTime);
    osc1.stop(startTime + totalDuration);

    // Oscilador 2: Tom agudo senoidal de reforço em harmonia
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';

    for (let i = 0; i < cycles; i++) {
      const cycleStart = startTime + (i * cycleDuration);
      const cycleMid = cycleStart + (cycleDuration * 0.5);
      const cycleEnd = cycleStart + cycleDuration;

      osc2.frequency.setValueAtTime(850, cycleStart);
      osc2.frequency.linearRampToValueAtTime(1650, cycleMid);
      osc2.frequency.linearRampToValueAtTime(850, cycleEnd);
    }

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.25, startTime + 0.08);
    gain2.gain.setValueAtTime(0.25, startTime + totalDuration - 0.2);
    gain2.gain.linearRampToValueAtTime(0.001, startTime + totalDuration);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(startTime);
    osc2.stop(startTime + totalDuration);

    // 4 Pulsos de Bip agudo estridente para cortar o barulho de máquinas e compressores
    for (let i = 0; i < cycles; i++) {
      const beepTime = startTime + (i * cycleDuration);
      const oscBeep = ctx.createOscillator();
      const gainBeep = ctx.createGain();

      oscBeep.type = 'square';
      oscBeep.frequency.setValueAtTime(1760, beepTime); // Lá 6

      gainBeep.gain.setValueAtTime(0.2, beepTime);
      gainBeep.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.12);

      oscBeep.connect(gainBeep);
      gainBeep.connect(ctx.destination);

      oscBeep.start(beepTime);
      oscBeep.stop(beepTime + 0.12);
    }

    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, (totalDuration + 0.5) * 1000);
  } catch (err) {
    console.warn("Aviso ao reproduzir sirene:", err);
  }
}

// 2. ALARME ENÉRGICO DE PEDIDOS (Bips Duplos Rápidos - 3.8s)
export function playIFoodAlert() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const bursts = [0.0, 0.9, 1.8, 2.7];
    bursts.forEach(t => {
      // Tom 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime + t);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime + t);
      osc1.stop(ctx.currentTime + t + 0.35);

      // Tom 2 mais agudo
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + t + 0.16);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + t + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + t + 0.16);
      osc2.stop(ctx.currentTime + t + 0.55);
    });

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 4000);
  } catch (e) {
    console.warn(e);
  }
}

// 3. CAMPAINHA SUAVE TRADICIONAL (3.5s)
export function playAppointmentChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },
      { freq: 659.25, time: 0.35, dur: 0.4 },
      { freq: 783.99, time: 0.7, dur: 0.4 },
      { freq: 1046.50, time: 1.05, dur: 0.8 },
      { freq: 659.25, time: 2.0, dur: 0.35 },
      { freq: 783.99, time: 2.35, dur: 0.35 },
      { freq: 1046.50, time: 2.7, dur: 0.8 },
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
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 3600);
  } catch (err) {
    console.warn("Aviso ao reproduzir som de notificação:", err);
  }
}

// Reproduz o som configurado
export function playNotificationSound(soundType: SoundType = 'SIREN') {
  if (soundType === 'SIREN') {
    playSirenAlert();
  } else if (soundType === 'IFOOD') {
    playIFoodAlert();
  } else {
    playAppointmentChime();
  }
}

export function AdminNotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('admin_sound_type') as SoundType;
      if (savedSound && ['SIREN', 'IFOOD', 'CHIME'].includes(savedSound)) {
        return savedSound;
      }
    }
    return 'SIREN';
  });
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const knownAppointmentIds = useRef<Set<string>>(new Set());
  const knownFeedbackIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSoundTypeChange = (type: SoundType) => {
    setSoundType(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_sound_type', type);
    }
    playNotificationSound(type);
  };

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
        title: '🚨 Alarme e Sirene Sonora para Agendamentos',
        description: 'Agora o sistema dispara uma sirene de 4 segundos a cada nova lavagem marcada para chamar sua atenção total no balcão!',
        timestamp: new Date(),
        read: false,
        badgeText: 'Alarme Ativo'
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

        // 2. Busca feedbacks recentes
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

              // Toca sirene/alarme se ativado (4.0 segundos)
              if (soundEnabled) {
                playNotificationSound(soundType);
              }

              // Exibe Toast na tela por 7 segundos
              setActiveToast(newNotif);
              setTimeout(() => setActiveToast(null), 7000);

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
                setTimeout(() => setActiveToast(null), 7000);

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
  }, [soundEnabled, soundType]);

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
                    playNotificationSound(soundType);
                  }
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  soundEnabled 
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40' 
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={soundEnabled ? "Som ativado (clique para alternar)" : "Som desativado (clique para ativar)"}
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

          {/* Seletor de Tipo de Alarme / Sirene */}
          <div className="p-3 bg-neutral-900/50 dark:bg-neutral-900 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
              Tipo de Sinal Sonoro:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSoundTypeChange('SIREN')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  soundType === 'SIREN'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-1 ring-red-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>🚨 Sirene</span>
              </button>

              <button
                type="button"
                onClick={() => handleSoundTypeChange('IFOOD')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  soundType === 'IFOOD'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>🔊 Alarme</span>
              </button>

              <button
                type="button"
                onClick={() => handleSoundTypeChange('CHIME')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  soundType === 'CHIME'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>🔔 Chime</span>
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
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
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Flame size={13} className="text-red-500" />
              <span>Sirene: 4.0s</span>
            </span>
            <button
              type="button"
              onClick={() => playNotificationSound(soundType)}
              className="font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <span>Testar {soundType === 'SIREN' ? 'Sirene 🚨' : soundType === 'IFOOD' ? 'Alarme 🔊' : 'Campainha 🔔'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner Toast Flutuante em Tempo Real */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-gray-900 border-2 border-red-500 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-500 shrink-0 animate-bounce">
              <Calendar size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">
                  🚨 NOVO AGENDAMENTO RECEBIDO!
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
