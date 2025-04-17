const CACHE_NAME = 'shadow-gate-v10';
const REQUEST_LIMIT_PER_DAY = 1000;
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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHE_URLS))
            .catch(err => console.error('Cache add failed:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME)
               .map(key => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length === 2 && pathParts[1] === 'animes') {
        event.respondWith(handleAnimeRequest(event, pathParts[0]));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

async function handleAnimeRequest(event, projectId) {
    try {
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

        const today = new Date().toISOString().split('T')[0];
        const updatedProjects = projects.map(p => {
            if (p.id === projectId) {
                const requestsToday = (p.requestsToday || 0) + 1;
                
                if (requestsToday > REQUEST_LIMIT_PER_DAY) {
                    throw new Error('Daily request limit reached');
                }
                
                return {
                    ...p,
                    requestsToday,
                    totalRequests: (p.totalRequests || 0) + 1,
                    lastRequestDate: today,
                    dailyRequests: {
                        ...p.dailyRequests,
                        [today]: (p.dailyRequests?.[today] || 0) + 1
                    }
                };
            }
            return p;
        });

        await updateProjectsInClient(updatedProjects);

        const animeData = {
            projectId,
            projectName: project.name,
            requestsToday: updatedProjects.find(p => p.id === projectId).requestsToday,
            requestsRemaining: REQUEST_LIMIT_PER_DAY - updatedProjects.find(p => p.id === projectId).requestsToday,
            animes: [
                { id: 1, title: "Attack on Titan", episodes: 75 },
                { id: 2, title: "Demon Slayer", episodes: 26 }
            ],
            updatedAt: new Date().toISOString()
        };

        return new Response(JSON.stringify(animeData), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message.includes('limit') ? 'Request limit exceeded' : 'Server error',
            message: error.message
        }), {
            status: error.message.includes('limit') ? 429 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getProjectsFromClient() {
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data || []);
        
        self.clients.matchAll()
            .then(clients => {
                if (clients.length) {
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

async function updateProjectsInClient(projects) {
    const client = await self.clients.matchAll().then(clients => clients[0]);
    if (client) {
        client.postMessage({
            type: 'UPDATE_PROJECTS',
            payload: projects
        });
    }
}
