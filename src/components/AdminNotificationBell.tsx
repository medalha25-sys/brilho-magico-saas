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
  Flame,
  MessageSquare,
  Car,
  User,
  Phone,
  DollarSign
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
  details?: {
    customerName?: string;
    customerPhone?: string;
    vehiclePlate?: string;
    serviceName?: string;
    totalPrice?: number;
    scheduledAt?: string;
    rating?: number;
    comment?: string;
    systemChangelog?: string[];
  };
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
    const totalDuration = 4.0;

    const osc1 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();

    osc1.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);

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

    for (let i = 0; i < cycles; i++) {
      const beepTime = startTime + (i * cycleDuration);
      const oscBeep = ctx.createOscillator();
      const gainBeep = ctx.createGain();

      oscBeep.type = 'square';
      oscBeep.frequency.setValueAtTime(1760, beepTime);

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
  const [selectedModal, setSelectedModal] = useState<NotificationItem | null>(null);
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
        badgeText: 'Alarme Ativo',
        details: {
          systemChangelog: [
            'Sirene potente de 4 segundos acionada automaticamente a cada agendamento',
            'Seletor com 3 opções de toques: Sirene de Alarme, Bip de Pedido e Campainha',
            'Central de Notificações com janela detalhada para ver avaliações e agendamentos',
            'Alerta visual Toast animado no topo da tela'
          ]
        }
      },
      {
        id: 'sys-update-2',
        type: 'SYSTEM',
        title: '🏢 Cadastro de Empresas (PJ) e Frotas Liberado',
        description: 'Na aba de Clientes, agora é possível cadastrar empresas parceiras com CNPJ, responsável e placas da frota.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: false,
        link: '/admin/clientes',
        badgeText: 'Recurso PJ',
        details: {
          systemChangelog: [
            'Alternador inteligente Pessoa Física vs Pessoa Jurídica (Empresas / Frotas)',
            'Campos para CNPJ formatado, Responsável de Frota e Observações de Convênio',
            'Filtro de busca rápida: Todos, Particulares e Empresas',
            'Fidelidade corporativa com pontuação para frotas'
          ]
        }
      },
      {
        id: 'sys-update-1',
        type: 'SYSTEM',
        title: '💰 Módulo Financeiro & Relatórios',
        description: 'Gere relatórios de faturamento semanal, mensal e anual, com gráficos e exportação para Excel.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        read: false,
        link: '/admin/financeiro',
        badgeText: 'Financeiro',
        details: {
          systemChangelog: [
            'Filtros por Hoje, Semanal (7 dias), Mensal, Anual e Período Personalizado',
            'Cards de KPIs: Faturamento Bruto, Lavagens Realizadas e Ticket Médio',
            'Gráfico de serviços mais vendidos e faturamento por categoria',
            'Exportação em 1 clique para planilha Excel (CSV) e Impressão A4 formatada'
          ]
        }
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
              badgeText: app.status,
              details: {
                customerName: app.customer_name,
                customerPhone: app.customer_phone,
                vehiclePlate: app.vehicle_plate,
                serviceName: serviceName,
                totalPrice: Number(app.total_price),
                scheduledAt: `${dateStr} às ${timeStr}`
              }
            });
          });
        }

        // 2. Busca feedbacks recentes
        const feedbackNotifications: NotificationItem[] = [];
        try {
          const { data: recentFeedbacks } = await supabase
            .from('feedbacks')
            .select('id, customer_name, customer_phone, comment, rating, created_at')
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
                badgeText: `${fb.rating} ⭐`,
                details: {
                  customerName: fb.customer_name || 'Cliente',
                  customerPhone: fb.customer_phone || undefined,
                  comment: fb.comment,
                  rating: Number(fb.rating)
                }
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

    // 3. Polling em tempo real a cada 8 segundos para novos agendamentos e feedbacks
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
                badgeText: 'NOVO',
                details: {
                  customerName: app.customer_name,
                  customerPhone: app.customer_phone,
                  vehiclePlate: app.vehicle_plate,
                  serviceName: serviceName,
                  totalPrice: Number(app.total_price),
                  scheduledAt: `${dateStr} às ${timeStr}`
                }
              };

              if (soundEnabled) {
                playNotificationSound(soundType);
              }

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
            .select('id, customer_name, customer_phone, comment, rating, created_at')
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
                  badgeText: `${fb.rating} ⭐`,
                  details: {
                    customerName: fb.customer_name || 'Cliente',
                    customerPhone: fb.customer_phone || undefined,
                    comment: fb.comment,
                    rating: Number(fb.rating)
                  }
                };

                if (soundEnabled) {
                  playNotificationSound('CHIME');
                }

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
    }, 8000);

    // 4. Inscrição em Tempo Real Instantânea (WebSockets Broadcast)
    const channel = supabase.channel('brilho-magico-realtime')
      .on('broadcast', { event: 'new-feedback' }, (response) => {
        const fb = response.payload as { id?: string; customer_name?: string; customer_phone?: string; comment?: string; rating?: number };
        if (!fb) return;
        const fid = fb.id || `fb-${Date.now()}`;
        if (knownFeedbackIds.current.has(fid)) return;
        knownFeedbackIds.current.add(fid);

        const newNotif: NotificationItem = {
          id: fid,
          type: 'FEEDBACK',
          title: `⭐ Nova Avaliação (${fb.rating || 5}/5 estrelas)`,
          description: `"${(fb.comment || '').slice(0, 100)}" — ${fb.customer_name || 'Cliente'}`,
          timestamp: new Date(),
          read: false,
          badgeText: `${fb.rating || 5} ⭐`,
          details: {
            customerName: fb.customer_name || 'Cliente',
            customerPhone: fb.customer_phone || undefined,
            comment: fb.comment,
            rating: Number(fb.rating || 5)
          }
        };

        if (soundEnabled) {
          playNotificationSound('CHIME');
        }

        setActiveToast(newNotif);
        setTimeout(() => setActiveToast(null), 7000);

        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('broadcast', { event: 'new-appointment' }, (response) => {
        const app = response.payload as { id?: string; customer_name?: string; customer_phone?: string; service_name?: string; scheduled_at?: string; total_price?: number; vehicle_plate?: string };
        if (!app) return;
        const aid = app.id || `app-${Date.now()}`;
        if (knownAppointmentIds.current.has(aid)) return;
        knownAppointmentIds.current.add(aid);

        const scheduledDate = app.scheduled_at ? new Date(app.scheduled_at) : new Date();
        const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = scheduledDate.toLocaleDateString('pt-BR');

        const newNotif: NotificationItem = {
          id: aid,
          type: 'APPOINTMENT',
          title: `🚗 Novo Agendamento: ${app.customer_name || 'Cliente'}`,
          description: `${app.service_name || 'Lavagem'} • ${dateStr} às ${timeStr} • R$ ${Number(app.total_price || 0).toFixed(2)} (${app.vehicle_plate || 'Sem placa'})`,
          timestamp: new Date(),
          read: false,
          link: '/admin/agendamentos',
          badgeText: 'NOVO',
          details: {
            customerName: app.customer_name,
            customerPhone: app.customer_phone,
            vehiclePlate: app.vehicle_plate,
            serviceName: app.service_name,
            totalPrice: Number(app.total_price || 0),
            scheduledAt: `${dateStr} às ${timeStr}`
          }
        };

        if (soundEnabled) {
          playNotificationSound(soundType);
        }

        setActiveToast(newNotif);
        setTimeout(() => setActiveToast(null), 7000);

        setNotifications(prev => [newNotif, ...prev]);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, soundType, supabase]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleOpenNotification = (n: NotificationItem) => {
    markSingleAsRead(n.id);
    setSelectedModal(n);
    setIsOpen(false);
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
        <>
          {/* Overlay transparente no Mobile para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs sm:hidden" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className={`w-full p-3.5 transition-colors text-left relative block ${
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

                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                          {n.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/60 dark:border-gray-800/40">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} />
                            {n.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                            Ver detalhes <ExternalLink size={10} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
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
      </>
      )}

      {/* Banner Toast Flutuante em Tempo Real */}
      {activeToast && (
        <div 
          onClick={() => handleOpenNotification(activeToast)}
          className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-gray-900 border-2 border-red-500 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300 cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-500 shrink-0 animate-bounce">
              <Calendar size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">
                  🚨 NOVO AVISO / AGENDAMENTO!
                </span>
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                {activeToast.description}
              </p>
              <span className="text-[10px] text-blue-500 font-bold mt-1.5 block">
                Clique para ver todos os detalhes →
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* JANELA MODAL COM OS DETALHES COMPLETOS DA NOTIFICAÇÃO */}
      {selectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Header da Janela */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  selectedModal.type === 'FEEDBACK'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : selectedModal.type === 'APPOINTMENT'
                    ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400'
                    : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                }`}>
                  {selectedModal.type === 'FEEDBACK' && <Star size={22} className="fill-current" />}
                  {selectedModal.type === 'APPOINTMENT' && <Calendar size={22} />}
                  {selectedModal.type === 'SYSTEM' && <Sparkles size={22} />}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {selectedModal.type === 'FEEDBACK' && 'Avaliação de Cliente'}
                    {selectedModal.type === 'APPOINTMENT' && 'Novo Agendamento'}
                    {selectedModal.type === 'SYSTEM' && 'Atualização do Sistema'}
                  </h3>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock size={11} />
                    {selectedModal.timestamp.toLocaleDateString('pt-BR')} às {selectedModal.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTEÚDO PARA FEEDBACK / AVALIAÇÃO */}
            {selectedModal.type === 'FEEDBACK' && (
              <div className="space-y-4">
                {/* 5 Estrelas em Destaque */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={28} 
                        className={star <= (selectedModal.details?.rating || 5)
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                          : 'text-gray-300 dark:text-gray-700'
                        } 
                      />
                    ))}
                  </div>
                  <span className="text-sm font-black text-amber-500">
                    Nota: {selectedModal.details?.rating || 5} de 5 Estrelas
                  </span>
                </div>

                {/* Comentário Completo */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Depoimento / O que achou do atendimento:
                  </label>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 text-sm leading-relaxed italic">
                    &ldquo;{selectedModal.details?.comment || selectedModal.description}&rdquo;
                  </div>
                </div>

                {/* Informações do Cliente */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <User size={13} /> Nome do Cliente:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedModal.details?.customerName || 'Cliente'}
                    </span>
                  </div>

                  {selectedModal.details?.customerPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Phone size={13} /> WhatsApp:
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {selectedModal.details.customerPhone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação do Feedback */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {selectedModal.details?.customerPhone && (
                    <a
                      href={`https://wa.me/55${selectedModal.details.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedModal.details.customerName || ''}! Muito obrigado pelo seu feedback na Brilho Mágico! Ficamos muito felizes com a sua avaliação.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-600/20"
                    >
                      <MessageSquare size={16} />
                      Agradecer no WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedModal(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* CONTEÚDO PARA NOVO AGENDAMENTO */}
            {selectedModal.type === 'APPOINTMENT' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                  <span className="px-2.5 py-1 rounded-full bg-green-500 text-gray-950 font-black text-[10px] uppercase tracking-wider inline-block mb-2">
                    Reserva Confirmada
                  </span>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedModal.details?.serviceName || 'Lavagem Automotiva'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Data/Hora: <strong>{selectedModal.details?.scheduledAt}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <User size={14} /> Cliente:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedModal.details?.customerName || 'Cliente'}
                    </span>
                  </div>

                  {selectedModal.details?.customerPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Phone size={14} /> WhatsApp:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedModal.details.customerPhone}
                      </span>
                    </div>
                  )}

                  {selectedModal.details?.vehiclePlate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Car size={14} /> Placa do Veículo:
                      </span>
                      <span className="font-mono font-black text-gray-900 dark:text-white uppercase bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {selectedModal.details.vehiclePlate}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <DollarSign size={14} /> Valor Total:
                    </span>
                    <span className="font-black text-sm text-green-600 dark:text-green-400">
                      R$ {Number(selectedModal.details?.totalPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Link
                    href="/admin/agendamentos"
                    onClick={() => setSelectedModal(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20 text-center"
                  >
                    <Calendar size={16} />
                    Ver no Painel de Agendamentos
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedModal(null)}
                    className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* CONTEÚDO PARA ATUALIZAÇÃO DO SISTEMA */}
            {selectedModal.type === 'SYSTEM' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                  <span className="px-2.5 py-1 rounded-full bg-purple-600 text-white font-black text-[10px] uppercase tracking-wider inline-block mb-1.5">
                    {selectedModal.badgeText || 'Novidade'}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedModal.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {selectedModal.description}
                  </p>
                </div>

                {selectedModal.details?.systemChangelog && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Principais Recursos Adicionados:
                    </label>
                    <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      {selectedModal.details.systemChangelog.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <span className="text-purple-500 font-bold shrink-0">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModal(null)}
                    className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md shadow-purple-600/20"
                  >
                    Entendido!
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
