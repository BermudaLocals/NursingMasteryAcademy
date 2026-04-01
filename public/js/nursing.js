// MedTrack Pro - Nursing Education Module

// Dosage Calculator
document.addEventListener('DOMContentLoaded', () => {
    initDosageCalculator();
    initTriageSim();
});

function initDosageCalculator() {
    const form = document.getElementById('dosage-form');
    if (form) {
        form.addEventListener('submit', calculateDosage);
    }
}

function calculateDosage(e) {
    e.preventDefault();
    
    const prescribed = parseFloat(document.getElementById('dose-prescribed').value);
    const available = parseFloat(document.getElementById('dose-available').value);
    const volume = parseFloat(document.getElementById('dose-volume').value);
    
    if (!prescribed || !available || !volume) {
        showResult('dose-result', 'Please fill all fields', 'error');
        return;
    }
    
    const doseToGive = (prescribed / available) * volume;
    showResult('dose-result', `Give: ${doseToGive.toFixed(2)} ${getUnit()}`, 'success');
    
    // Save to history
    addToHistory('dosage', `${prescribed} → ${doseToGive.toFixed(2)}`);
}

function getUnit() {
    const medType = document.getElementById('med-type')?.value || 'tablet';
    return medType === 'liquid' ? 'mL' : 'tablets';
}

function showResult(id, message, type) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.className = `result ${type}`;
    }
}

function addToHistory(type, result) {
    const history = JSON.parse(localStorage.getItem('medtrack_history') || '[]');
    history.push({ type, result, timestamp: new Date().toISOString() });
    localStorage.setItem('medtrack_history', history.slice(-20)); // keep last 20
}

// Triage Simulator
function initTriageSim() {
    const scenarios = [
        {
            patient: '65yo male, acute chest pain, diaphoretic',
            vitals: { hr: 110, bp: '90/60', rr: 22, o2: 92 },
            answer: 'Level 1 - Immediate',
            rationale: 'Chest pain + hypotension = cardiac emergency'
        },
        {
            patient: '25yo female, sprained ankle, no deformity',
            vitals: { hr: 80, bp: '120/80', rr: 16, o2: 98 },
            answer: 'Level 4 - Less urgent',
            rationale: 'Stable vitals, no life threat'
        },
        {
            patient: '35yo male, severe allergic reaction, stridor',
            vitals: { hr: 125, bp: '80/50', rr: 28, o2: 88 },
            answer: 'Level 1 - Immediate',
            rationale: 'Anaphylaxis with airway compromise'
        },
        {
            patient: '8yo child, fever 103°F, alert, playing',
            vitals: { hr: 120, bp: '100/60', rr: 24, o2: 99 },
            answer: 'Level 3 - Urgent',
            rationale: 'High fever in child needs prompt evaluation'
        },
        {
            patient: '45yo female, abdominal pain, vomiting x3 days',
            vitals: { hr: 105, bp: '110/70', rr: 18, o2: 97 },
            answer: 'Level 3 - Urgent',
            rationale: 'Possible obstruction, needs evaluation'
        }
    ];
    
    let currentScenario = 0;
    let score = 0;
    
    const startBtn = document.getElementById('start-triage');
    const simArea = document.getElementById('triage-sim');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            currentScenario = 0;
            score = 0;
            startTriageSim();
        });
    }
    
    function startTriageSim() {
        if (currentScenario >= scenarios.length) {
            showFinalScore();
            return;
        }
        
        const scenario = scenarios[currentScenario];
        simArea.innerHTML = `
            <div class="scenario-card">
                <h4>Patient ${currentScenario + 1} of ${scenarios.length}</h4>
                <p><strong>Presenting:</strong> ${scenario.patient}</p>
                <div class="vitals-display">
                    <span>HR: ${scenario.vitals.hr}</span>
                    <span>BP: ${scenario.vitals.bp}</span>
                    <span>RR: ${scenario.vitals.rr}</span>
                    <span>SpO2: ${scenario.vitals.o2}%</span>
                </div>
                <p>Select triage level:</p>
                <div class="triage-options">
                    ${['Immediate (1)', 'Emergency (2)', 'Urgent (3)', 'Less Urgent (4)', 'Non-Urgent (5)'].map((level, i) => `
                        <button onclick="selectTriageLevel(${i + 1})" class="triage-btn level-${i + 1}">${level}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        window.selectTriageLevel = (level) => {
            const correct = scenario.answer.includes(level.toString());
            if (correct) score++;
            
            showTriageFeedback(correct, scenario.answer, scenario.rationale, () => {
                currentScenario++;
                startTriageSim();
            });
        };
    }
    
    function showTriageFeedback(correct, answer, rationale, nextFn) {
        simArea.innerHTML = `
            <div class="feedback-card ${correct ? 'correct' : 'incorrect'}">
                <h4>${correct ? '✓ Correct!' : '✗ Incorrect'}</h4>
                <p><strong>Correct Answer:</strong> ${answer}</p>
                <p><strong>Rationale:</strong> ${rationale}</p>
                <button onclick="nextScenario()" class="btn-primary">Next Patient</button>
            </div>
        `;
        
        window.nextScenario = nextFn;
    }
    
    function showFinalScore() {
        const percentage = (score / scenarios.length) * 100;
        simArea.innerHTML = `
            <div class="score-card">
                <h4>Simulation Complete!</h4>
                <div class="score-display">${score}/${scenarios.length}</div>
                <p>${percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good effort!' : 'Keep practicing!'}</p>
                <button onclick="location.reload()" class="btn-primary">Try Again</button>
            </div>
        `;
    }
}
