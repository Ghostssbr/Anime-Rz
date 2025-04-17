const CACHE_NAME = 'shadow-gate-v10';
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

// Função para enviar alertas para o cliente
async function sendAlertToClient(message, type) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SHOW_ALERT',
      payload: { message, type }
    });
  });
}

// Instalação do Service Worker
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

// Ativação do Service Worker
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

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Rota /projectid/animes
  if (pathParts.length === 2 && pathParts[1] === 'animes') {
    event.respondWith(handleAnimeRequest(pathParts[0]));
    return;
  }

  // Outras requisições
  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        const networkResponse = await fetch(event.request);
        
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

// Manipulador da rota /animes
async function handleAnimeRequest(projectId) {
  try {
    // Obter projetos do cliente
    const projects = await getProjectsFromClient();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return new Response(JSON.stringify({ 
        error: 'Project not found',
        availableProjects: projects.map(p => p.id)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Gerar dados de anime (substitua por sua lógica real)
    const animeData = {
      projectId,
      projectName: project.name,
      animes: [
        { id: 1, title: "Attack on Titan", episodes: 75, year: 2013 },
        { id: 2, title: "Demon Slayer", episodes: 26, year: 2019 }
      ],
      total: 2,
      updatedAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(animeData), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Obter projetos do cliente via postMessage
async function getProjectsFromClient() {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data || []);
    };
    
    self.clients.matchAll()
      .then(clients => {
        if (clients && clients.length) {
          clients[0].postMessage({ 
            type: 'GET_PROJECTS' 
          }, [channel.port2]);
        } else {
          resolve([]);
        }
      })
      .catch(() => resolve([]));
  });
          }
