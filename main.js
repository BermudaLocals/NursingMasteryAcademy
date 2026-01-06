// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
}

// Nurse Bot Toggle
function toggleNurseBot() {
    const bot = document.getElementById('nurseBot');
    bot.classList.toggle('show');
}

// Send Message
function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (message) {
        addMessage(message, 'user');
        input.value = '';
        
        // Simulate bot response
        setTimeout(() => {
            const responses = {
                'hello': 'Hello! How can I assist you with your nursing studies today?',
                'thank you': "You're welcome! Is there anything else I can help you with?",
                '5 rights': 'The 5 Rights of Medication Administration are: Right Patient, Right Drug, Right Dose, Right Route, and Right Time.',
                'conversion': 'To convert feet to centimeters: 1 foot = 30.48 cm. So 5\'6" = 167.64 cm.',
                'vital signs': 'Normal vital signs for adults: BP 120/80 mmHg, HR 60-100 bpm, RR 12-20 breaths/min, Temp 97.8-99.1°F (36.5-37.3°C).',
                'default': 'I understand your question. Let me help you with that. For specific detailed information, please consult your course materials or ask your instructor.'
            };
            
            let response = responses.default;
            Object.keys(responses).forEach(key => {
                if (message.toLowerCase().includes(key)) {
                    response = responses[key];
                }
            });
            
            addMessage(response, 'bot');
        }, 1000);
    }
}

// Add Message to Chat
function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send Predefined Message
function sendPredefinedMessage(message) {
    document.getElementById('userInput').value = message;
    sendMessage();
}

// Handle Enter Key
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Language Change
function changeLanguage(lang) {
    const translations = {
        'en': {
            'welcome': 'Welcome to Nursing Mastery Academy! 🎓',
            'needHelp': 'Need Help? Ask Your Nurse Assistant! 💬',
            'courses': 'All Courses',
            'mentor': 'Meet Your Nursing Mentor',
            'community': 'Student Community 🤝',
            'pricing': 'Pricing & Enrollment'
        },
        'es': {
            'welcome': '¡Bienvenido a la Academia de Maestría en Enfermería! 🎓',
            'needHelp': '¿Necesita ayuda? Pida ayuda a su asistente de enfermera! 💬',
            'courses': 'Todos los Cursos',
            'mentor': 'Conoce a tu Mentor de Enfermería',
            'community': 'Comunidad de Estudiantes 🤝',
            'pricing': 'Precios y Matrícula'
        },
        'fr': {
            'welcome': 'Bienvenue à l\'Académie de Maîtrise en Soins Infirmiers! 🎓',
            'needHelp': 'Besoin d\'aide? Demandez à votre assistante infirmière! 💬',
            'courses': 'Tous les Cours',
            'mentor': 'Rencontrez votre Mentor en Soins Infirmiers',
            'community': 'Communauté d\'Étudiants 🤝',
            'pricing': 'Prix et Inscription'
        }
    };
    
    const t = translations[lang];
    if (t) {
        document.querySelector('#home h2').textContent = t.welcome;
        document.querySelector('#home h3').textContent = t.needHelp;
        document.querySelectorAll('nav a')[1].textContent = t.courses;
        document.querySelectorAll('nav a')[2].textContent = t.mentor;
        document.querySelectorAll('nav a')[3].textContent = t.community;
        document.querySelectorAll('nav a')[4].textContent = t.pricing;
        
        // Update dropdown button text
        const dropdownBtn = document.querySelector('.dropdown-btn');
        const flag = lang === 'en' ? '🇺🇸' : lang === 'es' ? '🇪🇸' : '🇫🇷';
        const languageName = lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Français';
        dropdownBtn.innerHTML = `${flag} ${languageName} ▼`;
    }
}

// Toggle Dropdown
function toggleDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Close dropdown when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.style.display === 'block') {
                openDropdown.style.display = 'none';
            }
        }
    }
}

// Initialize with welcome message
window.onload = function() {
    setTimeout(() => {
        addMessage("Welcome to Nursing Mastery Academy! I'm here to help you with any questions about nursing. Feel free to ask about medications, procedures, or any other topics from your course.", 'bot');
    }, 1000);
};
