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
        const res = (order / hand).toFixed(2);
        document.getElementById('calc-result').innerText = "Result: " + res + " mL";
        speak(res + " milliliters.");
    }
}

function answer(res) {
    if(res === 'correct') {
        speak("Correct judgment.");
        progress = Math.min(progress + 50, 100);
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Progress: " + progress + "%";
        if(progress >= 100) {
            document.getElementById('exam-btn').classList.remove('locked');
            document.getElementById('cert-action').classList.remove('hidden');
            document.getElementById('exam-status').innerText = "CERTIFICATION ELIGIBLE";
        }
    } else { speak("Incorrect. Check vitals."); }
}

function checkGlucose(v) {
    if(v < 70) speak("Hypoglycemia alert. 15 grams of carbs.");
    answer('correct');
}

function changeLanguage() {
    lang = document.getElementById('lang-select').value;
    speak("Updated.");
}

function togglePreMed() {
    speak("Physician Vault Active.");
    alert("Advanced Pathophysiology modules unlocked.");
}

function sendCertification() {
    const student = document.getElementById('student-display').innerText;
    // NOTE: Replace YOUR_FORMSPREE_ID when ready
    fetch("https://formspree.io/f/YOUR_FORMSPREE_ID", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: student, status: "Graduated" })
    }).then(() => {
        speak("Director notified.");
        alert("Director notified!");
    });
}
