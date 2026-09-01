const CACHE_NAME = 'brilho-magico-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Instalação do Service Worker e cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições com estratégia Network-First
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou esquemas como chrome-extension / supabase auth
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, armazena uma cópia no cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Se a rede falhar, tenta recuperar do cache local
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Retorna a página principal se for navegação offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});
