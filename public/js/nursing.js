// MedTrack Pro - Educational Only | Nursing Mastery Academy
// DISCLAIMER: Supplemental simulation training only. Not for clinical use.
// Always double-check with pharmacist / provider.

document.addEventListener('DOMContentLoaded', () => {
    initDosageCalculator();
    initTriageSim();
});

function initDosageCalculator() {
    const form = document.getElementById('dosage-form');
    if (!form) return;
    form.addEventListener('submit', calculateDosage);
}

function calculateDosage(e) {
    e.preventDefault();

    const prescribed = parseFloat(document.getElementById('dose-prescribed')?.value);
    const available = parseFloat(document.getElementById('dose-available')?.value);
    const volume = parseFloat(document.getElementById('dose-volume')?.value);

    if (!Number.isFinite(prescribed) ||!Number.isFinite(available) ||!Number.isFinite(volume) ||
        prescribed <=0 || available <=0 || volume <=0) {
        showResult('dose-result', 'Enter valid positive numbers for all fields.', 'error');
        return;
    }

    const doseToGive = (prescribed / available) * volume;

    if (!Number.isFinite(doseToGive) || doseToGive > 1000) {
        showResult('dose-result', 'Check values - result out of range. Educational only.', 'error');
        return;
    }

    showResult('dose-result', `Give: ${doseToGive.toFixed(2)} ${getUnit()} (VERIFY with official reference)`, 'success');
    addToHistory('dosage', `${prescribed} → ${doseToGive.toFixed(2)} ${getUnit()}`);
}

function getUnit() {
    const medType = document.getElementById('med-type')?.value || 'tablet';
    return medType === 'liquid'? 'mL' : 'tablets';
}

function showResult(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.className = `result ${type}`;
}

function addToHistory(type, result) {
    try {
        const history = JSON.parse(localStorage.getItem('medtrack_history') || '[]');
        history.push({ type, result, timestamp: new Date().toISOString() });
        localStorage.setItem('medtrack_history', JSON.stringify(history.slice(-20)));
    } catch {}
}

// --- Triage Simulator (CSP-safe, no inline onclick) ---
function initTriageSim() {
    const scenarios = [
        { patient: '65yo male, acute chest pain, diaphoretic', vitals: { hr: 110, bp: '90/60', rr: 22, o2: 92 }, level: 1, answer: 'Level 1 - Immediate', rationale: 'Chest pain + hypotension = cardiac emergency' },
        { patient: '25yo female, sprained ankle, no deformity', vitals: { hr: 80, bp: '120/80', rr: 16, o2: 98 }, level: 4, answer: 'Level 4 - Less urgent', rationale: 'Stable vitals, no life threat' },
        { patient: '35yo male, severe allergic reaction, stridor', vitals: { hr: 125, bp: '80/50', rr: 28, o2: 88 }, level: 1, answer: 'Level 1 - Immediate', rationale: 'Anaphylaxis with airway compromise' },
        { patient: '8yo child, fever 103°F, alert, playing', vitals: { hr: 120, bp: '100/60', rr: 24, o2: 99 }, level: 3, answer: 'Level 3 - Urgent', rationale: 'High fever in child needs prompt evaluation' },
        { patient: '45yo female, abdominal pain, vomiting x3 days', vitals: { hr: 105, bp: '110/70', rr: 18, o2: 97 }, level: 3, answer: 'Level 3 - Urgent', rationale: 'Possible obstruction, needs evaluation' }
    ];

    let current = 0, score = 0;
    const startBtn = document.getElementById('start-triage');
    const simArea = document.getElementById('triage-sim');
    if (!startBtn ||!simArea) return;

    startBtn.addEventListener('click', () => { current = 0; score = 0; render(); });

    function render() {
        if (current >= scenarios.length) { return showFinal(); }
        const s = scenarios[current];
        simArea.innerHTML = `
            <div class="scenario-card">
                <h4>Patient ${current + 1} of ${scenarios.length}</h4>
                <p><strong>Presenting:</strong> ${escapeHtml(s.patient)}</p>
                <div class="vitals-display"><span>HR: ${s.vitals.hr}</span><span>BP: ${escapeHtml(s.vitals.bp)}</span><span>RR: ${s.vitals.rr}</span><span>SpO2: ${s.vitals.o2}%</span></div>
                <p>Select triage level:</p>
                <div class="triage-options" data-level="${s.level}"></div>
            </div>`;
        const opts = simArea.querySelector('.triage-options');
        ['Immediate (1)','Emergency (2)','Urgent (3)','Less Urgent (4)','Non-Urgent (5)'].forEach((label,i)=>{
            const b = document.createElement('button');
            b.textContent = label;
            b.className = `triage-btn level-${i+1}`;
            b.addEventListener('click', ()=> handleSelect(i+1, s));
            opts.appendChild(b);
        });
    }

    function handleSelect(selected, scenario) {
        const correct = selected === scenario.level;
        if (correct) score++;
        simArea.innerHTML = `
            <div class="feedback-card ${correct? 'correct' : 'incorrect'}">
                <h4>${correct? '✓ Correct!' : '✗ Incorrect'}</h4>
                <p><strong>Correct:</strong> ${escapeHtml(scenario.answer)}</p>
                <p><strong>Rationale:</strong> ${escapeHtml(scenario.rationale)}</p>
                <button class="btn-primary" id="next-btn">Next Patient</button>
            </div>`;
        document.getElementById('next-btn').addEventListener('click', ()=>{ current++; render(); });
    }

    function showFinal() {
        const pct = (score / scenarios.length) * 100;
        simArea.innerHTML = `<div class="score-card"><h4>Complete!</h4><div class="score-display">${score}/${scenarios.length}</div><p>${pct >= 80? 'Excellent!' : pct >= 60? 'Good effort!' : 'Keep practicing!'}</p><button class="btn-primary" id="retry">Try Again</button></div>`;
        document.getElementById('retry').addEventListener('click', ()=> location.reload());
    }

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
}
