const CACHE_NAME = 'shadow-gate-v7';
const DATA_CACHE = 'api-data-v4';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([
            '/',
            '/home.html',
            '/dashboard.html',
            '/app.js',
            '/dashboard.js',
            '/dashboard.css',
            'https://cdn.tailwindcss.com',
            'https://cdn.jsdelivr.net/npm/chart.js',
            'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
        ]))
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    // Handle /:projectId/animes route
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    if (pathParts.length === 2 && pathParts[1] === 'animes') {
        e.respondWith(
            handleAnimesRequest(pathParts[0])
        );
        return;
    }
    
    if (url.pathname.startsWith('/api/')) {
        e.respondWith(
            handleApiRequest(e.request)
        );
        return;
    }

    e.respondWith(
        caches.match(e.request)
            .then(response => response || fetch(e.request))
    );
});

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
