let progress = 0;
let lang = "en-US";

function speak(t) {
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    m.lang = lang; m.pitch = 0.95; m.rate = 0.9;
    window.speechSynthesis.speak(m);
}

function unlockPortal() {
    const name = document.getElementById('student-name').value;
    document.getElementById('login-gate').classList.add('hidden');
    document.getElementById('main-portal').classList.remove('hidden');
    document.getElementById('student-display').innerText = name;
    speak("Welcome to the Academy, " + name + ". I am the Clinical Director.");
}

function loadModule(id) {
    document.querySelectorAll('.content-card').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mod-' + id).classList.remove('hidden');
    speak("Opening " + id);
}

function calculateDose() {
    const order = document.getElementById('dose-order').value;
    const hand = document.getElementById('dose-hand').value;
    if(order && hand) {
        const result = (order / hand).toFixed(2);
        document.getElementById('calc-result').innerText = "Result: " + result + " mL";
        speak("The calculated volume is " + result + " milliliters.");
    }
}

function answer(res) {
    if(res === 'correct') {
        speak("Correct. This is the elite standard of care.");
        progress = Math.min(progress + 50, 100);
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Progress: " + progress + "%";
        if(progress >= 100) document.getElementById('exam-btn').classList.remove('locked');
    } else {
        speak("Clinical error detected. Re-evaluate the patient's vitals immediately.");
    }
}

function checkGlucose(v) {
    if(v < 70) speak("Critical Hypoglycemia. Apply the 15-15 dietary rule now.");
    answer('correct');
}

function changeLanguage() {
    lang = document.getElementById('lang-select').value;
    speak("Language preference updated.");
}

function togglePreMed() {
    speak("Unlocking the Doctor's Vault. Differential diagnosis logic activated.");
    alert("Pre-Med/Physician-Track Vault is now unlocked for your session.");
    document.getElementById('mod-video').classList.remove('hidden');
}
