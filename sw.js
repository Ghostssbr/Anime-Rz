const CACHE_NAME = 'shadow-gate-v9';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/home.html',
  '/dashboard.html',
  '/app.js',
  '/dashboard.js',
  '/dashboard.css',
  '/_redirects'
];

async function sendAlertToClient(message, type) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SHOW_ALERT',
      payload: { message, type }
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(CACHE_URLS);
        await sendAlertToClient('Cache instalado com sucesso!', 'success');
      } catch (error) {
        await sendAlertToClient(`Falha na instalação do cache: ${error.message}`, 'danger');
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
        await sendAlertToClient('Service Worker ativado!', 'success');
      } catch (error) {
        await sendAlertToClient(`Falha na ativação: ${error.message}`, 'danger');
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/animes')) {
    event.respondWith(handleAnimeRequest(event));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        const networkResponse = await fetch(event.request);
        
        // Cache apenas respostas válidas
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        await sendAlertToClient(`Falha na requisição: ${error.message}`, 'warning');
        return new Response('Offline - Recursos não disponíveis', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

async function handleAnimeRequest(event) {
  try {
    const url = new URL(event.request.url);
    const projectId = url.pathname.split('/')[1];
    
    const animeData = {
      projectId,
      animes: [
        { id: 1, title: "Demon Slayer", episodes: 26 },
        { id: 2, title: "Jujutsu Kaisen", episodes: 24 }
      ],
      updatedAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(animeData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await sendAlertToClient(`Erro no endpoint /animes: ${error.message}`, 'danger');
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
