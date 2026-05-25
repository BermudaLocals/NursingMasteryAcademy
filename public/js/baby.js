// MedTrack Pro - Baby Health Tracker
let currentBaby = null;
let growthChart = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initBabyTracker();
});

async function initBabyTracker() {
    await loadBabiesList();
    initEventListeners();
    
    // If baby is selected, load data
    const babyId = new URLSearchParams(window.location.search).get('baby');
    if (babyId) {
        selectBaby(babyId);
    }
}

function initEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            showTab(tab);
        });
    });
    
    // Forms
    const basicInfoForm = document.getElementById('basic-info-form');
    if (basicInfoForm) {
        basicInfoForm.addEventListener('submit', handleBasicInfoSubmit);
    }
    
    const growthForm = document.getElementById('growth-form');
    if (growthForm) {
        growthForm.addEventListener('submit', handleGrowthSubmit);
    }
    
    const feedingForm = document.getElementById('feeding-form');
    if (feedingForm) {
        feedingForm.addEventListener('submit', handleFeedingSubmit);
    }
    
    const sleepForm = document.getElementById('sleep-form');
    if (sleepForm) {
        sleepForm.addEventListener('submit', handleSleepSubmit);
    }
    
    const diaperForm = document.getElementById('diaper-form');
    if (diaperForm) {
        diaperForm.addEventListener('submit', handleDiaperSubmit);
    }
}

async function loadBabiesList() {
    try {
        const response = await apiGet('/babies');
        const select = document.getElementById('baby-select');
        if (select && response.babies) {
            select.innerHTML = '<option value="">Select Baby</option>' + 
                response.babies.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    selectBaby(e.target.value);
                }
            });
        }
    } catch (err) {
        console.error('Failed to load babies:', err);
    }
}

async function selectBaby(babyId) {
    try {
        const response = await apiGet(`/babies/${babyId}`);
        currentBaby = response.baby;
        
        document.getElementById('current-baby-name').textContent = currentBaby.name;
        document.getElementById('baby-age').textContent = calculateAge(currentBaby.birth_date);
        document.getElementById('growth-stage').textContent = getGrowthStage(currentBaby.birth_date);
        
        // Load all data
        await Promise.all([
            loadGrowthData(),
            loadFeedingData(),
            loadSleepData(),
            loadDiaperData(),
            loadMilestones(),
            loadVaccinations()
        ]);
        
        showToast(`Loaded profile for ${currentBaby.name}`);
    } catch (err) {
        showToast('Failed to load baby data', 'error');
    }
}

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                   (now.getMonth() - birth.getMonth());
    
    if (months < 1) {
        const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
        return `${days} days`;
    } else if (months < 12) {
        return `${months} months`;
    } else {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
    }
}

function getGrowthStage(birthDate) {
    const birth = new Date(birthDate);
    const months = (new Date() - birth) / (1000 * 60 * 60 * 24 * 30);
    
    if (months < 3) return 'Newborn (0-3 months)';
    if (months < 12) return 'Infant (3-12 months)';
    if (years < 3) return 'Toddler (1-3 years)';
    if (years < 5) return 'Preschool (3-5 years)';
    return 'Child (5+ years)';
}

// Form handlers
async function handleGrowthSubmit(e) {
    e.preventDefault();
    if (!currentBaby) return showToast('Select a baby first', 'error');
    
    const data = {
        babyId: currentBaby.id,
        date: document.getElementById('growth-date').value,
        height: parseFloat(document.getElementById('height').value),
        weight: parseFloat(document.getElementById('weight').value),
        headCircumference: parseFloat(document.getElementById('head-circ').value)
    };
    
    try {
        await apiPost('/baby/growth', data);
        await loadGrowthData();
        e.target.reset();
        showToast('Growth recorded successfully');
    } catch (err) {
        showToast('Failed to record growth', 'error');
    }
}

async function loadGrowthData() {
    if (!currentBaby) return;
    try {
        const data = await apiGet(`/babies/${currentBaby.id}/growth`);
        renderGrowthTable(data.growth);
        renderGrowthChart(data.growth);
    } catch (err) {
        console.error('Failed to load growth data:', err);
    }
}

function renderGrowthTable(growth) {
    const tbody = document.getElementById('growth-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = growth.map(g => `
        <tr>
            <td>${new Date(g.date).toLocaleDateString()}</td>
            <td>${g.height} cm</td>
            <td>${g.weight} kg</td>
            <td>${g.head_circumference} cm</td>
            <td><button onclick="deleteGrowth(${g.id})" class="btn-icon">×</button></td>
        </tr>
    `).reverse().join('');
}

function renderGrowthChart(growth) {
    const ctx = document.getElementById('growth-chart');
    if (!ctx || !growth.length) return;
    
    if (growthChart) {
        growthChart.destroy();
    }
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: growth.map(g => new Date(g.date).toLocaleDateString()).reverse(),
            datasets: [{
                label: 'Weight (kg)',
                data: growth.map(g => g.weight).reverse(),
                borderColor: '#c5a059',
                tension: 0.4
            }, {
                label: 'Height (cm)',
                data: growth.map(g => g.height).reverse(),
                borderColor: '#8b5cf6',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function loadFeedingData() {
    if (!currentBaby) return;
    const data = await apiGet(`/babies/${currentBaby.id}/feeding`);
    renderFeedingTable(data.feeding);
}

function renderFeedingTable(feeding) {
    const tbody = document.getElementById('feeding-table-body');
    if (!tbody) return;
    tbody.innerHTML = feeding.map(f => `
        <tr>
            <td>${new Date(f.date).toLocaleDateString()}</td>
            <td>${f.type}</td>
            <td>${f.amount} ml</td>
            <td>${f.duration} min</td>
        </tr>
    `).reverse().join('');
}

async function loadSleepData() {
    if (!currentBaby) return;
    const data = await apiGet(`/babies/${currentBaby.id}/sleep`);
    renderSleepTable(data.sleep);
}

function renderSleepTable(sleep) {
    const tbody = document.getElementById('sleep-table-body');
    if (!tbody) return;
    tbody.innerHTML = sleep.map(s => `
        <tr>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td>${s.sleep_start} - ${s.sleep_end}</td>
            <td>${calculateDuration(s.sleep_start, s.sleep_end)}</td>
            <td>${s.type}</td>
        </tr>
    `).reverse().join('');
}

function calculateDuration(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let hours = eh - sh;
    let mins = em - sm;
    if (mins < 0) { hours--; mins += 60; }
    return `${hours}h ${mins}m`;
}

async function loadDiaperData() {
    if (!currentBaby) return;
    const data = await apiGet(`/babies/${currentBaby.id}/diaper`);
    renderDiaperTable(data.diaper);
}

function renderDiaperTable(diaper) {
    const tbody = document.getElementById('diaper-table-body');
    if (!tbody) return;
    tbody.innerHTML = diaper.map(d => `
        <tr>
            <td>${new Date(d.date).toLocaleDateString()}</td>
            <td>${d.type}</td>
            <td>${d.consistency || '-'}</td>
            <td>${d.color || '-'}</td>
        </tr>
    `).reverse().join('');
}

async function loadMilestones() {
    if (!currentBaby) return;
    const data = await apiGet(`/babies/${currentBaby.id}/milestones`);
    renderMilestones(data.milestones);
}

function renderMilestones(milestones) {
    const container = document.getElementById('milestones-container');
    if (!container) return;
    
    const categories = ['motor', 'cognitive', 'social', 'language'];
    container.innerHTML = categories.map(cat => `
        <div class="milestone-category">
            <h5>${cat.charAt(0).toUpperCase() + cat.slice(1)} Skills</h5>
            <div class="milestone-list">
                ${milestones.filter(m => m.category === cat).map(m => `
                    <div class="milestone-item ${m.achieved_date ? 'achieved' : ''}">
                        <input type="checkbox" ${m.achieved_date ? 'checked' : ''} 
                               onchange="toggleMilestone(${m.id}, this.checked)">
                        <span>${m.milestone_name}</span>
                        <small>${m.achieved_date ? new Date(m.achieved_date).toLocaleDateString() : ''}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

async function toggleMilestone(milestoneId, achieved) {
    try {
        await apiPost(`/baby/milestones/${milestoneId}`, { 
            achieved_date: achieved ? new Date().toISOString() : null 
        });
    } catch (err) {
        showToast('Failed to update milestone', 'error');
    }
}

async function loadVaccinations() {
    if (!currentBaby) return;
    const data = await apiGet(`/babies/${currentBaby.id}/vaccinations`);
    renderVaccinations(data.vaccinations);
}

function renderVaccinations(vaccinations) {
    const tbody = document.getElementById('vaccination-table-body');
    if (!tbody) return;
    tbody.innerHTML = vaccinations.map(v => `
        <tr class="${v.administered_date ? 'administered' : v.scheduled_date < new Date().toISOString() ? 'overdue' : ''}">
            <td>${v.vaccine_name}</td>
            <td>${new Date(v.scheduled_date).toLocaleDateString()}</td>
            <td>${v.administered_date ? new Date(v.administered_date).toLocaleDateString() : 'Pending'}</td>
            <td>${v.reaction || '-'}</td>
        </tr>
    `).join('');
}

async function generatePediatricianReport() {
    if (!currentBaby) return showToast('Select a baby first', 'error');
    
    try {
        const report = await apiGet(`/babies/${currentBaby.id}/report`);
        showReportModal('Pediatrician Report', formatPediatricianReport(report));
    } catch (err) {
        showToast('Failed to generate report', 'error');
    }
}

function formatPediatricianReport(report) {
    return `
        <h3>Pediatrician Visit Summary</h3>
        <p><strong>Child:</strong> ${report.baby.name}</p>
        <p><strong>Age:</strong> ${calculateAge(report.baby.birth_date)}</p>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr>
        <h4>Recent Growth</h4>
        ${report.growth.slice(-3).map(g => 
            `<p>${new Date(g.date).toLocaleDateString()}: ${g.weight}kg, ${g.height}cm</p>`
        ).join('') || '<p>No recent growth data</p>'}
        <h4>Current Feeding</h4>
        <p>${report.feeding.slice(-7).length} feedings in last 7 days</p>
        <h4>Sleep Patterns</h4>
        <p>Average daily sleep: ${calculateAverageSleep(report.sleep)} hours</p>
        <h4>Milestones</h4>
        <p>${report.milestones.filter(m => m.achieved_date).length} of ${report.milestones.length} milestones achieved</p>
        <h4>Vaccinations</h4>
        <p>Upcoming: ${report.vaccinations.filter(v => !v.administered_date && new Date(v.scheduled_date) > new Date()).length}</p>
    `;
}

function calculateAverageSleep(sleep) {
    if (!sleep.length) return 0;
    // Simple calculation for demo
    return Math.round(sleep.reduce((sum, s) => sum + (calculateDuration(s.sleep_start, s.sleep_end).includes('h') ? 1 : 0), 0));
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

function showReportModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <div class="report-content">${content}</div>
            <button onclick="window.print()" class="btn-primary">Print Report</button>
        </div>
    `;
    document.body.appendChild(modal);
}
