let progress = 0;
let lang = "en-US";

function speak(t) {
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    m.lang = lang; m.pitch = 0.9;
    window.speechSynthesis.speak(m);
}

function unlockPortal() {
    const name = document.getElementById('student-name').value;
    document.getElementById('login-gate').classList.add('hidden');
    document.getElementById('main-portal').classList.remove('hidden');
    document.getElementById('student-display').innerText = name;
    speak("Welcome to the Academy. I am the Director.");
}

function loadModule(id) {
    document.querySelectorAll('.content-card').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mod-' + id).classList.remove('hidden');
    speak("Loading " + id);
}

function answer(res) {
    if(res === 'correct') {
        speak("Correct. Elite judgment.");
        progress += 50;
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Progress: " + progress + "%";
        if(progress >= 100) document.getElementById('exam-btn').classList.remove('locked');
    } else {
        speak("Incorrect. Review your vitals chart.");
    }
}

function checkGlucose(v) {
    if(v < 70) speak("Hypoglycemia alert. Administer 15 grams of carbohydrates.");
    answer('correct');
}

function changeLanguage() {
    lang = document.getElementById('lang-select').value;
    speak("Language updated.");
}

function togglePreMed() {
    alert("Unlocking Pre-Med Vault. Physician-track logic activated.");
    speak("Welcome to the Doctor's Vault.");
}
