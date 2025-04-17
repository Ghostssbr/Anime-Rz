document.addEventListener('DOMContentLoaded', function() {
    const REQUEST_LIMIT_PER_DAY = 1000;
    const projectId = getProjectIdFromUrl();
    const project = loadProject(projectId);
    
    if (!project) {
        showAlert('Gate not found! Redirecting...', 'danger');
        setTimeout(() => window.location.href = 'home.html', 2000);
        return;
    }

    updateProjectUI(project);
    initUsageChart(project);
    setupTabs();
    setupCopyButtons();
    setupTimeframeButtons();

    document.getElementById('backButton').addEventListener('click', function() {
        window.location.href = 'home.html';
    });

    // Listener para atualizações do Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'UPDATE_PROJECTS') {
            const updatedProject = event.data.payload.find(p => p.id === projectId);
            if (updatedProject) {
                updateProjectUI(updatedProject);
            }
        }
    });

    function getProjectIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('project');
    }

    function loadProject(projectId) {
        const projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
        return projects.find(p => p.id === projectId);
    }

    function updateProjectUI(project) {
        // Atualizar informações básicas
        document.querySelectorAll('#snippetProjectId, #snippetProjectId2').forEach(el => {
            el.textContent = project.id;
        });

        document.getElementById('gateName').textContent = project.name;
        document.getElementById('gateId').textContent = project.id;
        document.getElementById('gateCreated').textContent = formatDate(project.createdAt);
        document.getElementById('apiEndpoint').textContent = `${window.location.origin}/api/${project.id}`;
        document.getElementById('spreadsheetUrl').textContent = project.url;

        // Atualizar estatísticas
        updateRequestStats(project);
        updateLevelProgress(project);
        updateGateStatus(project);

        // Adicionar card de endpoint /animes se o projeto existir
        const projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
        if (projects.some(p => p.id === project.id)) {
            const animeEndpointCard = `
            <div class="gate-card p-4">
                <h3 class="text-sm font-medium text-gray-300 mb-2 tracking-wider flex items-center">
                    <i class="bi bi-code-slash text-blue-400 mr-2"></i> ANIME API ENDPOINT
                </h3>
                <div class="flex items-center justify-between bg-gray-800 p-3 rounded border border-gray-700">
                    <span id="animeEndpoint" class="text-xs text-white truncate font-mono">${window.location.origin}/${project.id}/animes</span>
                    <button class="copy-button p-1 text-gray-400 hover:text-blue-400 transition">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Access this URL for anime data in JSON format</p>
            </div>`;
            
            const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.gap-4.mb-6');
            if (!document.getElementById('animeEndpoint')) {
                container.insertAdjacentHTML('beforeend', animeEndpointCard);
            }
        }
    }

    function updateRequestStats(project) {
        const today = new Date().toISOString().split('T')[0];
        const requestsToday = project.requestsToday || 0;
        const dailyPercentage = Math.min(100, (requestsToday / REQUEST_LIMIT_PER_DAY) * 100);
        
        // Atualizar contadores
        document.getElementById('dailyRequests').textContent = requestsToday;
        document.querySelector('.gate-card:nth-child(2) .h-1.bg-blue-500').style.width = `${dailyPercentage}%`;
        
        // Atualizar ou criar card de estatísticas
        let statsCard = document.querySelector('.request-stats-card');
        if (!statsCard) {
            statsCard = document.createElement('div');
            statsCard.className = 'gate-card p-4 request-stats-card';
            document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-4.mb-6').appendChild(statsCard);
        }
        
        statsCard.innerHTML = `
            <h3 class="text-xs font-medium text-gray-400 mb-1 tracking-wider">REQUEST STATISTICS</h3>
            <div class="mt-2 space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-400">Today:</span>
                    <span class="text-xs font-medium ${requestsToday >= REQUEST_LIMIT_PER_DAY ? 'text-red-400' : 'text-green-400'}">
                        ${requestsToday}/${REQUEST_LIMIT_PER_DAY}
                    </span>
                </div>
                <div class="h-1 bg-gray-700 rounded-full">
                    <div class="h-1 ${requestsToday >= REQUEST_LIMIT_PER_DAY ? 'bg-red-500' : 'bg-green-500'} rounded-full" 
                         style="width: ${dailyPercentage}%"></div>
                </div>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-gray-400">Total:</span>
                    <span class="text-xs font-medium text-blue-400">${project.totalRequests || 0}</span>
                </div>
            </div>
        `;
    }

    function updateLevelProgress(project) {
        const currentLevel = project.level || 1;
        const requestsNeeded = currentLevel * 100;
        const progress = ((project.totalRequests || 0) % 100) / 100 * 100;
        
        document.getElementById('levelProgressBar').style.width = `${progress}%`;
        document.getElementById('requestsToNextLevel').textContent = 
            Math.max(0, requestsNeeded - (project.totalRequests || 0));
    }

    function updateGateStatus(project) {
        const statusElement = document.getElementById('gateStatus');
        if (project.status === 'active') {
            statusElement.innerHTML = '<i class="bi bi-check-circle-fill mr-2"></i> ACTIVE';
            statusElement.className = 'text-xl font-bold text-green-400 flex items-center';
        } else {
            statusElement.innerHTML = '<i class="bi bi-exclamation-circle-fill mr-2"></i> INACTIVE';
            statusElement.className = 'text-xl font-bold text-yellow-400 flex items-center';
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function initUsageChart(project) {
        const ctx = document.getElementById('usageChart').getContext('2d');
        const activityData = project.activityData || {
            '7d': generateRandomData(5, 20),
            '30d': generateRandomData(5, 50),
            '90d': generateRandomData(5, 100)
        };
        
        window.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 7}, (_, i) => `Day ${i+1}`),
                datasets: [{
                    label: 'Requests',
                    data: activityData['7d'],
                    backgroundColor: 'rgba(58, 107, 255, 0.2)',
                    borderColor: 'rgba(58, 107, 255, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: getChartOptions()
        });
    }

    function generateRandomData(min, max) {
        return Array.from({length: max}, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    function getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleColor: '#E2E8F0',
                    bodyColor: '#CBD5E1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    usePointStyle: true
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        };
    }

    function setupTabs() {
        const tabLinks = document.querySelectorAll('.tab-link');
        
        tabLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                tabLinks.forEach(tab => {
                    tab.classList.remove('border-blue-400', 'text-blue-400');
                    tab.classList.add('border-transparent', 'text-gray-400');
                });
                
                this.classList.add('border-blue-400', 'text-blue-400');
                this.classList.remove('border-transparent', 'text-gray-400');
                
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    function setupCopyButtons() {
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', function() {
                const text = this.previousElementSibling.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    const icon = this.innerHTML;
                    this.innerHTML = '<i class="bi bi-check2 text-green-400"></i>';
                    setTimeout(() => {
                        this.innerHTML = icon;
                    }, 2000);
                });
            });
        });
    }

    function setupTimeframeButtons() {
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.timeframe-btn').forEach(b => {
                    b.classList.remove('active', 'text-white');
                    b.classList.add('text-gray-400');
                });
                this.classList.add('active', 'text-white');
                this.classList.remove('text-gray-400');
                
                updateChart(this.getAttribute('data-days'));
            });
        });
    }

    function updateChart(days) {
        const project = loadProject(getProjectIdFromUrl());
        const activityData = project.activityData || {
            '7d': generateRandomData(5, 20),
            '30d': generateRandomData(5, 50),
            '90d': generateRandomData(5, 100)
        };
        
        const chart = window.currentChart;
        const daysKey = days + 'd';
        
        chart.data.labels = Array.from({length: days}, (_, i) => `Day ${i+1}`);
        chart.data.datasets[0].data = activityData[daysKey] || generateRandomData(5, days * 10);
        chart.update();
    }

    function simulateRequest() {
        const projectId = getProjectIdFromUrl();
        let projects = JSON.parse(localStorage.getItem('shadowGateProjects4')) || [];
        const projectIndex = projects.findIndex(p => p.id === projectId);
        
        if (projectIndex >= 0) {
            projects[projectIndex].requestsToday = (projects[projectIndex].requestsToday || 0) + 1;
            projects[projectIndex].totalRequests = (projects[projectIndex].totalRequests || 0) + 1;
            
            const currentLevel = projects[projectIndex].level || 1;
            if (projects[projectIndex].totalRequests >= currentLevel * 100) {
                projects[projectIndex].level = currentLevel + 1;
                showAlert(`Gate leveled up to level ${currentLevel + 1}!`, 'success');
            }
            
            localStorage.setItem('shadowGateProjects4', JSON.stringify(projects));
            updateProjectUI(projects[projectIndex]);
        }
    }

    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold tracking-wider z-50 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'danger' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    }
});
