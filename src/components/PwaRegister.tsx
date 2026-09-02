"use client";

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles, PlusSquare, MoreVertical, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    // 1. Registra o Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('✅ PWA Service Worker ativo:', reg.scope);
          })
          .catch((err) => {
            console.warn('Aviso ao registrar Service Worker:', err);
          });
      });
    }

    if (typeof window === 'undefined') return;

    // Detecta se a página atual é do Administrador ou do Cliente
    const path = window.location.pathname;
    const isAdmin = path.startsWith('/admin') || path === '/login';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAdminMode(isAdmin);

    // Atualiza o link do manifest dinamicamente no head para garantir separação de PWA
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = isAdmin ? '/manifest-admin.json' : '/manifest-cliente.json';

    // 2. Verifica se o app já está rodando como PWA instalado (Standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(true);
      return;
    }

    // Detecta se é dispositivo móvel (celular ou tablet)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/.test(userAgent) || window.innerWidth < 768;
    setIsIOS(isApple);

    // Captura o evento nativo de instalação do Chrome / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Quando o app é instalado
    window.addEventListener('appinstalled', () => {
      setShowReminder(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // 3. Exibe o lembrete amigável no celular após 2.5 segundos (se o usuário não tiver dispensado recentemente)
    if (isMobile) {
      const storageKey = isAdmin ? 'pwa_admin_reminder_dismissed' : 'pwa_cliente_reminder_dismissed';
      const dismissedUntil = localStorage.getItem(storageKey);
      const now = Date.now();

      if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
        const timer = setTimeout(() => {
          setShowReminder(true);
        }, 2500);

        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Ao clicar em "Adicionar Atalho" / "Instalar"
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowReminder(false);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.log(err);
      }
    }

    // Se for iOS ou navegador Android sem prompt direto
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowAndroidModal(true);
    }
  };

  // Dispensar lembrete de forma não intrusiva (lembra por 3 dias)
  const handleDismiss = () => {
    setShowReminder(false);
    try {
      const storageKey = isAdminMode ? 'pwa_admin_reminder_dismissed' : 'pwa_cliente_reminder_dismissed';
      const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem(storageKey, threeDaysFromNow.toString());
    } catch (e) {
      console.log(e);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Lembrete Amigável e Discreto Flutuante no Celular */}
      {showReminder && (
        <aside 
          aria-label="Lembrete de instalação do aplicativo"
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
        >
          <div className={`p-4 rounded-3xl border text-white shadow-2xl backdrop-blur-md relative overflow-hidden ${
            isAdminMode 
              ? 'bg-gray-950/95 border-blue-500/40'
              : 'bg-neutral-900/95 dark:bg-gray-950/95 border-green-500/30'
          }`}>
            {/* Barra de destaque superior */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              isAdminMode
                ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600'
                : 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-600'
            }`}></div>

            <div className="flex items-start justify-between gap-2 mb-2 pt-0.5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isAdminMode
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/10 text-green-400'
                }`}>
                  {isAdminMode ? <ShieldCheck size={16} /> : <Smartphone size={16} />}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {isAdminMode ? 'Instalar App de Gestão' : 'Dica: Adicione o Atalho'}
                  </span>
                  {!isAdminMode && <Sparkles size={12} className="text-amber-400" />}
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Fechar lembrete"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed mb-3">
              {isAdminMode ? (
                <>Instale o <strong>Painel de Gestão Brilho Mágico</strong> no seu celular para gerenciar o caixa, clientes e agendamentos em tempo real.</>
              ) : (
                <>Tenha o aplicativo da <strong>Brilho Mágico</strong> na tela do seu celular para agendar lavagens em 1 toque, sem precisar abrir o navegador.</>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 ${
                  isAdminMode
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                    : 'bg-green-600 hover:bg-green-500 text-neutral-950 shadow-green-500/20'
                }`}
              >
                <Download size={13} />
                <span>{isAdminMode ? 'Instalar Painel' : 'Adicionar à Tela'}</span>
              </button>

              <button
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal Explicativo para iPhone / iPad (Safari) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isAdminMode ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                  <Smartphone size={18} />
                </div>
                <h3 className="font-bold text-white text-sm">Adicionar no iPhone / iPad</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p className="text-neutral-400">É super simples adicionar o atalho ao seu iPhone:</p>
              
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>1</span>
                  <span>Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com a setinha para cima 📤 no rodapé do Safari).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>2</span>
                  <span>Role para baixo nas opções e toque em <strong>&quot;Adicionar à Tela de Início&quot; 📱</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>3</span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className={`mt-5 w-full py-2.5 font-bold rounded-xl text-xs transition-colors ${
                isAdminMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-neutral-950'
              }`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Explicativo para Android (quando não dispara direto pelo navegador) */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isAdminMode ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                  <Smartphone size={18} />
                </div>
                <h3 className="font-bold text-white text-sm">Adicionar no Android</h3>
              </div>
              <button 
                onClick={() => setShowAndroidModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p className="text-neutral-400">Para fixar o app na tela do seu celular:</p>
              
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    <MoreVertical size={11} />
                  </div>
                  <span>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior do seu navegador (Chrome/Samsung).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    <PlusSquare size={11} />
                  </div>
                  <span>Selecione <strong>&quot;Adicionar à tela inicial&quot;</strong> ou <strong>&quot;Instalar aplicativo&quot;</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${isAdminMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>3</span>
                  <span>Confirme em <strong>Adicionar</strong>. O ícone aparecerá direto no seu menu de apps!</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidModal(false)}
              className={`mt-5 w-full py-2.5 font-bold rounded-xl text-xs transition-colors ${
                isAdminMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-neutral-950'
              }`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
