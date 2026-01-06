let progress = 0;
let lang = "en-US";

function speak(t) {
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    m.lang = lang; m.rate = 1;
    window.speechSynthesis.speak(m);
}

function unlockPortal() {
    const name = document.getElementById('student-name').value;
    document.getElementById('student-display').innerText = name;
    
    // Switch Views
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('main-portal').style.display = 'block';
    
    // Force Module 1 to show
    loadModule('vitals');
    
    speak("Initialization complete. Welcome, " + name);
}

function loadModule(id) {
    // Hide all modules using style.display
    const cards = document.getElementsByClassName('content-card');
    for (let card of cards) {
        card.style.display = 'none';
    }
    
    // Show specific module
    const target = document.getElementById('mod-' + id);
    if(target) {
        target.style.display = 'block';
    }

    // Nav highlights
    const btns = document.getElementsByClassName('nav-btn');
    for (let btn of btns) {
        btn.classList.remove('active');
    }
    const activeBtn = document.getElementById('nav-' + id);
    if(activeBtn) activeBtn.classList.add('active');
}

function answer(type) {
    if(type === 'correct') {
        speak("Correct judgment. Progress saved.");
        progress = Math.min(progress + 50, 100);
        document.getElementById('progress-bar').style.width = progress + "%";
        document.getElementById('progress-text').innerText = "Progress: " + progress + "%";
        
        if(progress >= 100) {
            document.getElementById('exam-btn').classList.remove('locked');
            document.getElementById('cert-action').classList.remove('hidden');
            speak("Final assessment unlocked.");
        }
    } else {
        speak("Incorrect. Review your vitals.");
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
    speak("Physician Vault active.");
    alert("Pre-Med Clinical logic enabled.");
}
