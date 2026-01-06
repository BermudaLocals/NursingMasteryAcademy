// --- ELITE ENGINE CONFIG ---
let studentName = "Tash Robinson";
let progress = 0;
let currentLang = "en-US";

const translations = {
    "en-US": { welcome: "Welcome to the Director's Office.", triage: "Vital Signs Triage", alert: "Emergency! Check the Red Zone." },
    "es-ES": { welcome: "Bienvenido a la Oficina del Director.", triage: "Triaje de Signos Vitales", alert: "¡Emergencia! Revise la Zona Roja." },
    "fr-FR": { welcome: "Bienvenue au Bureau du Directeur.", triage: "Triage des Signes Vitaux", alert: "Urgence ! Vérifiez la Zone Rouge." }
};

// --- VOICE SYNTHESIS ---
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang;
    utterance.pitch = 0.95; // Authoritative tone
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

// --- PORTAL NAVIGATION ---
function unlockPortal() {
    const inputName = document.getElementById('student-name').value;
    if(inputName) studentName = inputName;
    
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('main-portal').classList.remove('hidden');
    document.getElementById('student-display').innerText = studentName;
    
    document.getElementById('welcome-msg').innerText = `Mentoring: ${studentName}`;
    speak(`${translations[currentLang].welcome} Let's begin, ${studentName}.`);
}

function loadModule(modId) {
    // UI Cleanup
    document.querySelectorAll('.content-card').forEach(card => card.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Activate Module
    document.getElementById('mod-' + modId).classList.remove('hidden');
    document.getElementById('btn-' + modId)?.classList.add('active');
    
    speak(`Loading ${modId} module.`);
}

// --- CLINICAL LOGIC ---
function answer(choice) {
    if(choice === 'red' || choice === 'no') {
        speak("Correct judgment. That is the elite standard.");
        updateProgress(50);
    } else {
        speak("Clinical error detected. Review the vitals chart immediately.");
    }
}

function updateProgress(amount) {
    progress = Math.min(progress + amount, 100);
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-percent').innerText = progress + '%';
    
    if(progress >= 100) {
        document.getElementById('exam-btn').classList.remove('locked');
        speak("You have reached 100 percent. The Final Certification is now unlocked.");
    }
}

function changeLanguage() {
    currentLang = document.getElementById('lang-select').value;
    speak(translations[currentLang].welcome);
}

function togglePreMed() {
    alert("Director's Notice: Accessing the Doctor's Vault requires Physician-Track Credentials ($3,495 upgrade).");
    // In production, this links to Stripe/Payment
    document.getElementById('mod-premed').classList.remove('hidden');
}

function mayaHelp() {
    speak("I am Nurse Maya. Remember, when in doubt, check the ABCs: Airway, Breathing, and Circulation.");
}
