const CACHE_NAME = 'shadow-gate-v8'; // Atualize a versão
const DATA_CACHE = 'api-data-v5';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([
            '/',
            '/index.html', // Adicione isso
            '/home.html',
            '/dashboard.html',
            '/app.js',
            '/dashboard.js',
            '/dashboard.css',
            '/_redirects', // Adicione isso
            'https://cdn.tailwindcss.com',
            'https://cdn.jsdelivr.net/npm/chart.js',
            'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
        ]).catch(err => console.error('Failed to cache', err)) // Adicione tratamento de erro
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME && key !== DATA_CACHE)
               .map(key => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    // Ignora requisições não GET ou de outras origens
    if (e.request.method !== 'GET' || !url.origin.includes(location.origin)) {
        return;
    }

    // Rotas dinâmicas
    if (url.pathname.endsWith('/animes') {
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length === 2) {
            e.respondWith(handleAnimesRequest(pathParts[0]));
            return;
        }
    }

    // Estratégia Cache First com fallback para network
    e.respondWith(
        caches.match(e.request).then(cached => {
            return cached || fetch(e.request).then(response => {
                // Não cacheamos respostas opacas (como analytics)
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                
                // Cache apenas para assets importantes
                if (e.request.url.includes('/api/') || 
                    e.request.destination === 'script' || 
                    e.request.destination === 'style') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache));
                }
                return response;
            }).catch(() => {
                // Fallback para página offline se necessário
                if (e.request.destination === 'document') {
                    return caches.match('/offline.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// ... (mantenha as outras funções como handleAnimesRequest, getAnimeData, etc.)

async function handleApiOrAnimeRequest(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(part => part !== '');

  // Rota /:projectId/animes
  if (pathParts.length === 2 && pathParts[1] === 'animes') {
    return handleAnimesRequest(pathParts[0]);
  }

  // Outras rotas de API (se houver)
  return handleApiRequest(request);
}

async function handleAnimesRequest(projectId) {
    try {
        // Get projects from client
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

        // Get anime data (you can replace this with your actual data source)
        const animeData = await getAnimeData(projectId);
        
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

async function getAnimeData(projectId) {
    // Example data - replace with your actual data source
    // This could come from localStorage, Supabase, or an external API
    const animeTitles = [
        "Attack on Titan",
        "Demon Slayer",
        "Jujutsu Kaisen",
        "My Hero Academia",
        "Death Note",
        "Fullmetal Alchemist: Brotherhood",
        "Hunter x Hunter",
        "One Punch Man",
        "Steins;Gate",
        "Cowboy Bebop"
    ];

    return {
        projectId,
        projectName: `Anime Portal ${projectId.slice(-3)}`,
        animes: animeTitles.map((title, index) => ({
            id: index + 1,
            title,
            episodes: Math.floor(Math.random() * 100) + 12,
            rating: (Math.random() * 5).toFixed(1),
            year: 2010 + Math.floor(Math.random() * 13)
        })),
        total: animeTitles.length,
        lastUpdated: new Date().toISOString()
    };
}

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

async function handleApiRequest(request) {
    const cache = await caches.open(DATA_CACHE);
    const cached = await cache.match(request);
    
    if (cached) return cached;

    try {
        const response = await fetch(request);
        await cache.put(request, response.clone());
        return response;
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Offline mode',
            cached: true
        }), { 
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            } 
        });
    }
            }
