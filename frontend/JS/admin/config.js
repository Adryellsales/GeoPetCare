// ── CONFIGURAÇÃO GERAL ──
const API_BASE = 'http://localhost:3000/api/v1';
let animals = [];
let volunteers = [];
let adotantes = [];
let matches = [];
let filterVolStatus = '';
let searchVolTerm = '';
let currentUser = null;
let selectedRisk = 'baixo';
let filterStatus = '';
let selectedRiskFilter = '';
let searchTerm = '';
let editingId = null;
let currentVoluntarioId = null;

async function loadAdminViews() {
    const contentEl = document.getElementById('content');
    if (!contentEl) {
        console.error('Conteiner de views não encontrado: #content');
        return;
    }

    const views = [
        'dashboard',
        'animais',
        'voluntarios',
        'triagem',
        'adotantes',
        'matches',
        'transparencia',
        'config',
        'doacoes'
    ];

    await Promise.all(views.map(async viewName => {
        const response = await fetch(`views/${viewName}.html`);
        if (!response.ok) {
            throw new Error(`Falha ao carregar a view ${viewName}: ${response.status}`);
        }
        const html = await response.text();
        const wrapper = document.createElement('template');
        wrapper.innerHTML = html.trim();
        contentEl.appendChild(wrapper.content);
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAdminViews();
        await initAdmin();
    } catch (err) {
        console.error('Erro ao carregar views do admin:', err);
        showToast('Erro ao carregar o painel', 'Verifique o console para mais detalhes');
    }
});

async function initAdmin() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        currentUser = await response.json();
        document.getElementById('admin-nome').textContent = currentUser.nome || 'Admin';
        document.getElementById('admin-perfil').textContent = (currentUser.perfil || 'ADMIN').toUpperCase();
        document.getElementById('admin-avatar').textContent = currentUser.nome ? currentUser.nome.slice(0, 2).toUpperCase() : 'AD';

        setView('animais');
        await renderVoluntarios();
    } catch (err) {
        console.error('Erro ao validar sessão:', err);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

function riskClass(r) {
    const classes = { 'critico': 'risk-critico', 'grave': 'risk-grave', 'medio': 'risk-medio', 'baixo': 'risk-baixo' };
    return classes[r?.toLowerCase()] || '';
}

function statusClass(s) {
    const classes = { 'disponivel': 'status-disponivel', 'em_processo': 'status-processo', 'adotado': 'status-adotado', 'lar_temporario': 'status-lar' };
    return classes[s?.toLowerCase()] || '';
}

function avatarBg(e) {
    return e?.toLowerCase() === 'gato' ? 'rgba(96,165,250,0.15)' : 'rgba(61,214,140,0.15)';
}

function logoutAdmin() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function showToast(icon, title, sub) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-sub').textContent = sub;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

function setView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.style.display = 'block';

    const navBtn = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (navBtn) navBtn.classList.add('active');

    const btnNew = document.querySelector('.topbar-btn.primary');
    if (viewName === 'animais') {
        document.getElementById('current-view-name').textContent = 'Animais';
        if (btnNew) btnNew.style.display = 'block';
        renderTable();
    } else if (viewName === 'voluntarios') {
        document.getElementById('current-view-name').textContent = 'Voluntários';
        if (btnNew) btnNew.style.display = 'none';
        renderVoluntarios();
    } else if (viewName === 'triagem') {
        document.getElementById('current-view-name').textContent = 'Triagem Médica';
        if (btnNew) btnNew.style.display = 'none';
        renderTriagem();
    } else if (viewName === 'adotantes') {
        document.getElementById('current-view-name').textContent = 'Adotantes';
        if (btnNew) btnNew.style.display = 'none';
        renderAdotantes();
    } else if (viewName === 'doacoes') {
        document.getElementById('current-view-name').textContent = 'Doações';
        if (btnNew) btnNew.style.display = 'none';
        renderDoacoes();
    } else if (viewName === 'matches') {
        document.getElementById('current-view-name').textContent = 'Matches';
        if (btnNew) btnNew.style.display = 'none';
        renderMatches();
    } else if (viewName === 'transparencia') {
        document.getElementById('current-view-name').textContent = 'Transparência';
        if (btnNew) btnNew.style.display = 'none';
        renderTransparencia();
    } else {
        document.getElementById('current-view-name').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        if (btnNew) btnNew.style.display = 'none';
    }
}
