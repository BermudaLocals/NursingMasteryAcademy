let progress = 0;
let lang = "en-US";

function speak(t) {
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    m.lang = lang;
    window.speechSynthesis.speak(m);
}

function unlockPortal() {
    const name = document.getElementById('student-name').value;
    document.getElementById('student-display').innerText = name;
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('main-portal').style.display = 'block';
    speak("Director " + name + " online.");
}

function loadModule(id) {
    const cards = document.getElementsByClassName('content-card');
    for (let card of cards) { card.style.display = 'none'; }
    document.getElementById('mod-' + id).style.display = 'block';

    const btns = document.getElementsByClassName('nav-btn');
    for (let btn of btns) { btn.classList.remove('active'); }
    document.getElementById('nav-' + id).classList.add('active');
    speak("Accessing module");
}

function answer(type) {
    if(type === 'correct') {
        speak("Correct judgment.");
        progress = Math.min(progress + 50, 100);
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Progress: " + progress + "%";
        
        if(progress >= 100) {
            const eb = document.getElementById('exam-btn');
            eb.classList.remove('locked');
            document.getElementById('cert-action').style.display = 'block';
            document.getElementById('exam-status').innerText = "READY FOR GRADUATION";
            speak("Certification unlocked.");
        }
    } else { speak("Incorrect. Check vitals."); }
}

function calculateDose() {
    const o = document.getElementById('dose-order').value;
    const h = document.getElementById('dose-hand').value;
    if(o && h) {
        const r = (o / h).toFixed(2);
        document.getElementById('calc-result').innerText = "Result: " + r + " mL";
        speak(r + " milliliters.");
    }
}

function checkGlucose(v) {
    if(v < 70) speak("Hypoglycemia alert.");
    answer('correct');
}

function togglePreMed() {
    speak("Pre Med Vault Active.");
    alert("Physician-Track logic activated.");
}
