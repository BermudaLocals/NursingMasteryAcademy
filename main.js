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
    
    // THE FIX: Completely remove the login gate element
    const gate = document.getElementById('login-gate');
    gate.style.display = 'none';
    
    // Ensure the main body can scroll now
    document.body.style.overflow = 'auto';
    
    speak("System active. Welcome Director " + name);
}

function loadModule(id) {
    const cards = document.getElementsByClassName('content-card');
    for (let card of cards) { card.style.display = 'none'; }
    
    const target = document.getElementById('mod-' + id);
    if(target) { target.style.display = 'block'; }

    const btns = document.getElementsByClassName('nav-btn');
    for (let btn of btns) { btn.classList.remove('active'); }
    
    const activeBtn = document.getElementById('nav-' + id);
    if(activeBtn) activeBtn.classList.add('active');
    
    speak("Loading module");
}

function answer(type) {
    if(type === 'correct') {
        speak("Correct judgment.");
        progress = Math.min(progress + 50, 100);
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Clinical Progress: " + progress + "%";
        if(progress >= 100) {
            document.getElementById('exam-btn').classList.remove('locked');
            speak("Certification available.");
        }
    } else {
        speak("Clinical error. Review vitals.");
    }
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
    speak("Pre Med Vault Unlocked");
    alert("Physician-Track logic activated.");
}
