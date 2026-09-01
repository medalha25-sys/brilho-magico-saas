"use client";

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Registra o Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('✅ PWA Service Worker registrado com sucesso:', reg.scope);
          })
          .catch((err) => {
            console.warn('Aviso ao registrar Service Worker:', err);
          });
      });
    }

    // 2. Verifica se o app já está em modo PWA standalone (instalado)
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      if (isStandalone) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsInstalled(true);
        return;
      }

      // Detecta iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleDevice);

      // Captura o evento nativo de instalação do Android / Chrome / Edge
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowInstallBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Oculta banner se foi instalado com sucesso
      window.addEventListener('appinstalled', () => {
        setShowInstallBanner(false);
        setIsInstalled(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Banner Flutuante de Instalação do PWA */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 rounded-2xl bg-neutral-900/95 dark:bg-gray-950/95 border border-green-500/30 text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/logo.jpg" 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-cover border border-neutral-700 shrink-0" 
              />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-xs font-bold text-white truncate">
                  Instalar Aplicativo
                </span>
                <span className="text-[10px] text-neutral-400 truncate">
                  Acesse com 1 toque na sua tela inicial
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-green-500/20 transition-colors"
              >
                <Download size={13} /> Instalar
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal explicativo de instalação para iPhone / iPad (Safari) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                  <Smartphone size={18} />
                </div>
                <h3 className="font-bold text-white text-sm">Instalar no iPhone / iPad</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p>Para instalar o aplicativo no seu dispositivo Apple:</p>
              
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-green-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta para cima 📤 no Safari).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-green-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Role para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot; 📱</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-green-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 bg-green-600 hover:bg-green-500 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
