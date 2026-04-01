// MedTrack Pro - Common Application Code
const API_BASE_URL = window.location.origin + '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
});

// Auth functions
function initAuth() {
    const token = localStorage.getItem('medtrack_token');
    const user = JSON.parse(localStorage.getItem('medtrack_user') || '{}');
    
    // Update UI based on auth state
    if (document.getElementById('user-name')) {
        document.getElementById('user-name').textContent = user.name || 'User';
    }
    
    // Protect routes
    const protectedPages = ['dashboard.html', 'pets.html', 'baby.html', 'nursing.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (protectedPages.includes(currentPage) && !token) {
        window.location.href = '/index.html';
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('medtrack_token');
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    };
}

function logout() {
    localStorage.removeItem('medtrack_token');
    localStorage.removeItem('medtrack_user');
    window.location.href = '/index.html';
}

// Navigation
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// API helpers
async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (err) {
        showToast('API Error: ' + err.message, 'error');
        throw err;
    }
}

async function apiPost(endpoint, data) {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (err) {
        showToast('API Error: ' + err.message, 'error');
        throw err;
    }
}

async function apiDelete(endpoint) {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (err) {
        showToast('API Error: ' + err.message, 'error');
        throw err;
    }
}
