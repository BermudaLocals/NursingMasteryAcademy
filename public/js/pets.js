let currentPetId = null, pets = [], charts = {};

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    initTabs();
    loadPets();
    document.getElementById('petSelect').addEventListener('change', onPetChange);
    document.querySelectorAll('#stoolDate, #mealDateTime, #vitalDate, #actDate, #hydDate, #medName').forEach(el => { if(el) el.value = nowStr().slice(0,el.type==='date'?10:16); });
});

function initTabs() {
    document.querySelectorAll('.tabs').forEach(tabs => {
        tabs.addEventListener('click', e => {
            if (!e.target.classList.contains('tab')) return;
            const region = e.target.closest('.tabs');
            const id = e.target.dataset.tab;
            region.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            region.parentElement.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const content = document.getElementById('tab-' + id);
            if (content) content.classList.add('active');
        });
    });
}

function toggleForm(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

async function loadPets() {
    try {
        pets = await API.get('/pets') || [];
        const sel = document.getElementById('petSelect');
        sel.innerHTML = '<option value="">Select a pet...</option>' + pets.map(p => `<option value="${p.id}">${p.name} (${p.species || 'Unknown'})</option>`).join('');
    } catch(e) {}
}

function onPetChange(e) {
    const id = e.target.value;
    const profile = document.getElementById('petProfile');
    profile.classList.toggle('hidden', !id);
    if (!id) { currentPetId = null; return; }
    currentPetId = parseInt(id);
    const pet = pets.find(p => p.id === currentPetId);
    if (pet) {
        document.getElementById('petName').textContent = pet.name;
        document.getElementById('petDetails').innerHTML = `${pet.species}${pet.breed ? ' • ' + pet.breed : ''}${pet.age ? ' • ' + pet.age : ''}${pet.weight ? ' • ' + pet.weight + 'kg' : ''}`;
        document.getElementById('petAvatar').textContent = avatarForSpecies(pet.species);
    }
    loadAllPetData();
}

function avatarForSpecies(species) {
    const s = (species || '').toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('bird')) return '🐦';
    if (s.includes('rabbit')) return '🐰';
    if (s.includes('fish')) return '🐠';
    if (s.includes('hamster')) return '🐹';
    if (s.includes('reptile')) return '🦎';
    return '🐾';
}

async function loadAllPetData() {
    if (!currentPetId) return;
    try {
        const [stools, meals, vitals, activity, hydration, meds] = await Promise.allSettled([
            API.get(`/pets/${currentPetId}/stools`), API.get(`/pets/${currentPetId}/meals`), API.get(`/pets/${currentPetId}/vitals`),
            API.get(`/pets/${currentPetId}/activity`), API.get(`/pets/${currentPetId}/hydration`), API.get(`/pets/${currentPetId}/medications`)
        ]);
        renderStools(stools.status === 'fulfilled' ? stools.value : []);
        renderMeals(meals.status === 'fulfilled' ? meals.value : []);
        renderVitals(vitals.status === 'fulfilled' ? vitals.value : []);
        renderActivity(activity.status === 'fulfilled' ? activity.value : []);
        renderHydration(hydration.status === 'fulfilled' ? hydration.value : []);
        renderMeds(meds.status === 'fulfilled' ? meds.value : []);
    } catch(e) {}
}

function renderStools(data) {
    renderList('stoolData', data, ['date', 'consistency', 'color', 'frequency'], r => [formatDate(r.date), r.consistency || '—', r.color || '—', r.frequency || '—']);
}
function renderMeals(data) {
    renderList('mealData', data, ['date', 'food_type', 'portions', 'appetite'], r => [formatDateTime(r.date), r.food_type || '—', r.portion || '—', (r.appetite_level ? '★'.repeat(r.appetite_level) : '—')]);
}
function renderVitals(data) {
    renderList('vitalData', data, ['date', 'temperature', 'heart_rate', 'respiratory', 'weight'], r => [formatDate(r.date), r.temperature ? r.temperature + '°F' : '—', r.heart_rate ? r.heart_rate + 'bpm' : '—', r.respiratory_rate ? r.respiratory_rate + '/min' : '—', r.weight ? r.weight + 'kg' : '—']);
    renderVitalCharts(data);
}
function renderActivity(data) {
    renderList('actData', data, ['date', 'energy', 'issues'], r => [formatDate(r.date), r.energy_level ? (['Lethargic','Low','Normal','Active','Hyperactive'][r.energy_level-1]) : '—', r.mobility_issues || '—']);
}
function renderHydration(data) {
    renderList('hydData', data, ['date', 'water', 'urination', 'color'], r => [formatDate(r.date), r.water_intake_ml ? r.water_intake_ml + 'ml' : '—', r.urination_freq || '—', r.urine_color || '—']);
}
function renderMeds(data) {
    const container = document.getElementById('medData');
    if (!data || data.length === 0) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">💊</div><p>No medications</p></div>'; return; }
    container.innerHTML = data.map(m => `<div class="med-card"><div class="med-card-header"><span class="med-name">${m.med_name}</span><div class="btn-group"><button class="btn btn-sm btn-secondary" onclick="recordMedDose(${m.id})">Log Dose</button><button class="btn btn-sm btn-danger" onclick="deleteMed(${m.id})">Delete</button></div></div><div class="med-details"><span><span class="med-detail-label">Dose:</span> ${m.dose || 'N/A'}</span><span><span class="med-detail-label">Schedule:</span> ${m.schedule || 'N/A'}</span><span><span class="med-detail-label">Last given:</span> ${m.administered_at ? formatDateTime(m.administered_at) : 'Never'}</span></div>${m.notes ? `<div class="med-notes mt-2">${m.notes}</div>` : ''}</div>`).join('');
}

function renderList(id, data, fields, mapRow) {
    const el = document.getElementById(id);
    if (!data || data.length === 0) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No entries yet</p></div>'; return; }
    const rows = data.slice(-10).reverse();
    el.innerHTML = '<div class="entry-list">' + rows.map(r => `<div class="entry-item"><div>${mapRow(r).map((v,i) => fields[i] ? `<span class="text-muted">${fields[i]}:</span> ${v}` : v).join(' • ')}</div><div class="entry-actions"><button class="btn btn-sm btn-danger" onclick="deleteEntry('/pets/${currentPetId}/${id.replace('Data','').toLowerCase()}/${r.id}')">Delete</button></div></div>`).join('') + '</div>';
}

function renderVitalCharts(data) {
    const labels = data.slice(-14).map(v => formatDate(v.date));
    const weights = data.map(v => v.weight || null);
    const temps = data.map(v => v.temperature || null);
    if (charts.weight) charts.weight.destroy();
    if (charts.temperature) charts.temperature.destroy();
    const wCtx = document.getElementById('weightChart');
    if (wCtx) charts.weight = new Chart(wCtx, { type: 'line', data: { labels, datasets: [{ label: 'Weight (kg)', data: weights, borderColor: chartTheme.borderColor, backgroundColor: chartTheme.backgroundColor, fill: true, tension: 0.4 }] }, options: getChartOptions('Weight Trend') });
    const tCtx = document.getElementById('tempChart');
    if (tCtx) charts.temperature = new Chart(tCtx, { type: 'line', data: { labels, datasets: [{ label: 'Temp (°F)', data: temps, borderColor: chartTheme.secondaryBorder, backgroundColor: chartTheme.secondaryBg, fill: true, tension: 0.4 }] }, options: getChartOptions('Temperature Trend') });
}

async function saveStool() {
    const payload = { date: document.getElementById('stoolDate').value, consistency: document.getElementById('stoolConsistency').value, color: document.getElementById('stoolColor').value, frequency: document.getElementById('stoolFreq').value, blood: document.getElementById('stoolBlood').checked ? 1 : 0, mucus: document.getElementById('stoolMucus').checked ? 1 : 0, notes: document.getElementById('stoolNotes').value };
    try { await API.post(`/pets/${currentPetId}/stools`, payload); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function saveMeal() {
    const payload = { date: document.getElementById('mealDateTime').value, food_type: document.getElementById('mealFood').value, portion: document.getElementById('mealPortion').value, appetite_level: parseInt(document.getElementById('mealAppetite').value), vomited: document.getElementById('mealVomit').checked ? 1 : 0, notes: document.getElementById('mealNotes').value };
    try { await API.post(`/pets/${currentPetId}/meals`, payload); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function saveVital() {
    const payload = { date: document.getElementById('vitalDate').value, temperature: parseFloat(document.getElementById('vitalTemp').value) || null, heart_rate: parseInt(document.getElementById('vitalHR').value) || null, respiratory_rate: parseInt(document.getElementById('vitalRR').value) || null, weight: parseFloat(document.getElementById('vitalWeight').value) || null, notes: document.getElementById('vitalNotes').value };
    try { await API.post(`/pets/${currentPetId}/vitals`, payload); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function saveActivity() {
    const payload = { date: document.getElementById('actDate').value, energy_level: parseInt(document.getElementById('actEnergy').value), mobility_issues: document.getElementById('actMobility').value, notes: document.getElementById('actNotes').value };
    try { await API.post(`/pets/${currentPetId}/activity`, payload); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function saveHydration() {
    const payload = { date: document.getElementById('hydDate').value, water_intake_ml: parseInt(document.getElementById('hydWater').value) || null, urination_freq: document.getElementById('hydUrine').value, urine_color: document.getElementById('hydColor').value, notes: document.getElementById('hydNotes').value };
    try { await API.post(`/pets/${currentPetId}/hydration`, payload); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function saveMedication() {
    const payload = { med_name: document.getElementById('medName').value, dose: document.getElementById('medDose').value, schedule: document.getElementById('medSchedule').value, notes: document.getElementById('medNotes').value };
    try { await API.post(`/pets/${currentPetId}/medications`, payload); hideModal('petModal'); showToast('Saved', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function recordMedDose(medId) {
    try { await API.put(`/pets/${currentPetId}/medications/${medId}`, { administered_at: new Date().toISOString() }); showToast('Dose recorded', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
async function deleteMed(medId) {
    if (!confirmAction('Delete medication?')) return;
    try { await API.delete(`/pets/${currentPetId}/medications/${medId}`); showToast('Deleted', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}

function showAddPetModal() { currentPetId = null; document.getElementById('petModalTitle').textContent = 'Add New Pet'; document.getElementById('pmName').value = ''; document.getElementById('pmSpecies').value = ''; document.getElementById('pmBreed').value = ''; document.getElementById('pmAge').value = ''; document.getElementById('pmWeight').value = ''; document.getElementById('pmNotes').value = ''; showModal('petModal'); }
function showEditPetModal() { const pet = pets.find(p => p.id === currentPetId); if(!pet) return; document.getElementById('petModalTitle').textContent = 'Edit Pet'; document.getElementById('pmName').value = pet.name; document.getElementById('pmSpecies').value = pet.species || ''; document.getElementById('pmBreed').value = pet.breed || ''; document.getElementById('pmAge').value = pet.age || ''; document.getElementById('pmWeight').value = pet.weight || ''; document.getElementById('pmNotes').value = pet.notes || ''; showModal('petModal'); }

async function savePet() {
    const payload = { name: document.getElementById('pmName').value, species: document.getElementById('pmSpecies').value, breed: document.getElementById('pmBreed').value, age: document.getElementById('pmAge').value, weight: parseFloat(document.getElementById('pmWeight').value) || null, notes: document.getElementById('pmNotes').value };
    try {
        if (!payload.name) return showToast('Name required', 'warning');
        hideModal('petModal');
        if (currentPetId === null) await API.post('/pets', payload); else await API.put(`/pets/${currentPetId}`, payload);
        showToast('Saved', 'success'); await loadPets(); document.getElementById('petSelect').value = ''; onPetChange({target:{value:''}});
    } catch(e) { showToast(e.message, 'error'); }
}

async function deletePet() {
    if (!currentPetId || !confirmAction('Delete pet and all records?')) return;
    try { await API.delete(`/pets/${currentPetId}`); showToast('Deleted', 'success'); await loadPets(); onPetChange({target:{value:''}}); } catch(e) { showToast(e.message, 'error'); }
}

async function generateReport() {
    const days = parseInt(document.getElementById('reportDays').value);
    if (!currentPetId) return showToast('Select a pet first', 'warning');
    try {
        const report = await API.get(`/pets/${currentPetId}/report?days=${days}`);
        const content = document.getElementById('reportContent');
        const concerns = [];
        (report.stools || []).forEach(s => { if (s.bloody === 1) concerns.push(`Blood in stool on ${formatDate(s.date)}`); if (s.mucus === 1) concerns.push(`Mucus in stool on ${formatDate(s.date)}`); });
        (report.vitals || []).forEach(v => { if (v.temperature > 103 || v.temperature < 99) concerns.push(`Abnormal temp ${v.temperature}°F on ${formatDate(v.date)}`); });
        content.innerHTML = `<div class="report-container" id="vetReport"><div class="report-header"><h2>Veterinary Visit Summary</h2><p>${report.pet?.name || 'Pet'} • ${new Date().toLocaleDateString()}</p></div><div class="grid-2 mb-3"><div class="card"><h4>Patient Info</h4><p><strong>Name:</strong> ${report.pet?.name || '—'}<br><strong>Species:</strong> ${report.pet?.species || '—'}<br><strong>Breed:</strong> ${report.pet?.breed || '—'}<br><strong>Age:</strong> ${report.pet?.age || '—'}</p></div><div class="card"><h4>Report Period</h4><p>Last ${days} days<br><strong>Records:</strong> ${(report.stools?.length||0)+(report.meals?.length||0)+(report.vitals?.length||0)} entries<br><strong>Weight:</strong> ${report.trends?.latest_weight || 'N/A'} kg</p></div></div>${concerns.length > 0 ? `<div class="report-flags"><h3>⚠️ Concerns</h3>${concerns.map(c=>`<div class="report-flag-item">• ${c}</div>`).join('')}</div>` : ''}<div class="report-section"><h3>Recent Stools</h3><p>${(report.stools || []).slice(-5).map(s => `${formatDate(s.date)}: ${s.consistency || '—'}${s.bloody ? ' (BLOOD)' : ''}`).join('<br>') || 'No records'}</p></div><div class="report-section"><h3>Recent Medications</h3><p>${(report.medications || []).map(m => `${m.med_name}: ${m.dose} - ${m.schedule}`).join('<br>') || 'No medications'}</p></div><div class="report-section"><h3>Recommendations</h3><p>${report.recommendations?.join(', ') || 'Continue monitoring. Schedule regular check-ups.'}</p></div></div>`;
    } catch(e) { showToast(e.message, 'error'); }
}

async function deleteEntry(url) {
    if (!confirmAction('Delete this entry?')) return;
    try { await API.delete(url); showToast('Deleted', 'success'); loadAllPetData(); } catch(e) { showToast(e.message, 'error'); }
}
