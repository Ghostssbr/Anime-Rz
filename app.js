document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Supabase
    const supabaseUrl = 'https://nwoswxbtlquiekyangbs.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Sua chave real aqui
    window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Setup service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
            
            // Listen for messages from SW
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'GET_PROJECTS') {
                    const projects = JSON.parse(localStorage.getItem('shadowGateProjects3')) || [];
                    event.ports[0].postMessage(projects);
                }
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    await loadProjects();
    setupForm();
});

async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    const noProjects = document.getElementById('noProjects');
    const projects = JSON.parse(localStorage.getItem('shadowGateProjects3')) || [];
    
    container.innerHTML = '';
    noProjects.classList.toggle('hidden', projects.length > 0);

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card bg-gray-800 rounded-lg overflow-hidden cursor-pointer';
        card.innerHTML = `
            <div class="absolute top-2 right-2 bg-solo-dark text-solo-blue border border-solo-blue px-2 py-1 rounded-full text-xs font-bold tracking-wider">
                LV. ${project.level}
            </div>
            <div class="p-4 border-b border-gray-700">
                <div class="flex justify-between items-start">
                    <h3 class="text-lg font-semibold text-white tracking-wider">${project.name}</h3>
                    <span class="status-badge ${project.status === 'active' ? 'text-green-400' : 'text-yellow-400'} text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-20 ${project.status === 'active' ? 'bg-green-900' : 'bg-yellow-900'}">
                        ${project.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
                <p class="text-xs text-gray-400 mt-1 tracking-wider">CREATED ${new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="p-4">
                <div class="flex items-center mb-3">
                    <i class="bi bi-link text-gray-400 mr-2"></i>
                    <span class="text-xs text-gray-300 truncate">${project.url}</span>
                </div>
                <div class="flex justify-between text-xs text-gray-400 tracking-wider">
                    <span>${project.requestsToday} REQUESTS TODAY</span>
                    <span class="flex items-center">
                        <i class="bi bi-arrow-right text-solo-blue ml-1"></i>
                    </span>
                </div>
                <div class="mt-2 text-xs text-blue-400">
                    API: <span class="text-gray-300">/${project.id}/animes</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => window.location.href = `dashboard.html?project=${project.id}`);
        container.appendChild(card);
    });
}

function setupForm() {
    document.getElementById('newProjectForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const projectName = document.getElementById('projectName').value.trim();
        const spreadsheetUrl = document.getElementById('spreadsheetUrl').value.trim();
        
        if (!projectName || !spreadsheetUrl) {
            showAlert('Please fill all required fields', 'danger');
            return;
        }

        const newProject = {
            id: `gate-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: projectName,
            url: spreadsheetUrl,
            status: 'active',
            createdAt: new Date().toISOString(),
            requestsToday: 0,
            totalRequests: 0,
            level: 1,
            activityData: generateActivityData()
        };
        
        try {
            // Save to localStorage
            let projects = JSON.parse(localStorage.getItem('shadowGateProjects3')) || [];
            projects.push(newProject);
            localStorage.setItem('shadowGateProjects3', JSON.stringify(projects));
            
            // Save to Supabase
            const { error } = await supabase
                .from('project_tokens')
                .insert([{
                    project_id: newProject.id,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            
            showAlert('Project created successfully!', 'success');
            setTimeout(() => loadProjects(), 500);
            
        } catch (error) {
            showAlert(`Error: ${error.message}`, 'danger');
            console.error(error);
        }
    });
}

function generateActivityData() {
    return {
        '7d': Array.from({length: 7}, () => Math.floor(Math.random() * 50) + 10),
        '30d': Array.from({length: 30}, () => Math.floor(Math.random() * 100) + 20),
        '90d': Array.from({length: 90}, () => Math.floor(Math.random() * 150) + 30)
    };
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold tracking-wider z-50 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'danger' ? 'bg-red-600' :
        'bg-blue-600'
    }`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}