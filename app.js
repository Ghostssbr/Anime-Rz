document.addEventListener('DOMContentLoaded', async function() {
    const supabaseUrl = 'https://nwoswxbtlquiekyangbs.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53b3N3eGJ0bHF1aWVreWFuZ2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODEwMjcsImV4cCI6MjA2MDM1NzAyN30.KarBv9AopQpldzGPamlj3zu9eScKltKKHH2JJblpoCE'; // Sua chave real aqui
    let supabase;
    
    if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      showAlert('Service Worker registrado com sucesso!', 'success');
      
      // Verifica se há atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            showAlert('Nova versão disponível! Atualizando...', 'info');
            window.location.reload();
          }
        });
      });
    } catch (error) {
      showAlert(`Falha no registro do Service Worker: ${error.message}`, 'danger');
      console.error('SW registration failed:', error);
    }
  });
}

    try {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        window.supabase = supabase;
        //showAlert('Conexão com o Supabase estabelecida!', 'success');
        await loadProjects();
        setupForm();
    } catch (error) {
        showAlert(`Erro: ${error.message}`, 'danger');
    }
});

// ... (loadProjects permanece igual)


// ... (restante das funções permanecem iguais)

function loadProjects() {
    const container = document.getElementById('projectsContainer');
    const noProjects = document.getElementById('noProjects');
    const projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
    
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
            showAlert('Preencha todos os campos obrigatórios', 'danger');
            return;
        }

        let newProject; // Declarar fora do try para acesso no catch
        
        try {
            // Gerar ID único seguro
            const idProject = `gate-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            
            newProject = {
                id: idProject,
                name: projectName,
                url: spreadsheetUrl,
                status: 'active',
                createdAt: new Date().toISOString(),
                requestsToday: 0,
                totalRequests: 0,
                level: 1,
                activityData: generateActivityData()
            };
            
            // Salvar no localStorage
            let projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
            projects.push(newProject);
            localStorage.setItem('shadowGateProjects4', JSON.stringify(projects));
            
            // Criar token no Supabase
            const { error } = await supabase
                .from('project_tokens') // Nome correto da tabela
                .insert([{
                    project_id: idProject,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) {
                throw new Error(`Supabase: ${error.message}`);
            }
            
            showAlert('Projeto criado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = `dashboard.html?project=${newProject.id}`;
            }, 1500);
            
        } catch (error) {
            const errorMessage = error.message || 'Erro desconhecido';
            showAlert(`Erro ao criar projeto: ${errorMessage}`, 'warning');
            
            if (newProject) {
                setTimeout(() => {
                    window.location.href = `dashboard.html?project=${newProject.id}`;
                }, 2000);
            }
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

async function saveProject(project) {
    let projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
    projects.push(project);
    localStorage.setItem('shadowGateProjects4', JSON.stringify(projects));
    await updateServiceWorkerCache();
}

async function updateServiceWorkerCache() {
    if ('caches' in window) {
        const cache = await caches.open('shadow-gate-data');
        const projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
        await cache.put('/projects.json', new Response(JSON.stringify(projects)));
    }
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
