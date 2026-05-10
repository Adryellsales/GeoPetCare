// ── DASHBOARD ADMIN ──
async function renderDashboard() {
    try {
        // Carregar dados de várias APIs
        const [animaisRes, voluntariosRes, adotantesRes, matchesRes, doacoesRes] = await Promise.all([
            fetch(`${API_BASE}/animais`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`${API_BASE}/voluntarios`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`${API_BASE}/adotantes`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`${API_BASE}/matches`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
            fetch(`${API_BASE}/doacoes/dashboard`)
        ]);

        const animais = animaisRes.ok ? (await animaisRes.json()).dados || [] : [];
        const voluntarios = voluntariosRes.ok ? (await voluntariosRes.json()).dados || [] : [];
        const adotantes = adotantesRes.ok ? (await adotantesRes.json()).dados || [] : [];
        const matches = matchesRes.ok ? (await matchesRes.json()).dados || [] : [];
        const dashboardData = doacoesRes.ok ? await doacoesRes.json() : {};

        // Atualizar cards principais
        document.getElementById('dash-total-animais').textContent = animais.length;
        document.getElementById('dash-voluntarios-ativos').textContent = voluntarios.filter(v => v.status === 'aprovado').length;
        document.getElementById('dash-total-adotantes').textContent = adotantes.length;
        document.getElementById('dash-matches-ativos').textContent = matches.filter(m => m.status === 'ativo').length;
        document.getElementById('dash-doacoes-mes').textContent = `R$ ${(dashboardData.arrecadacao_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('dash-triagem-pendente').textContent = animais.filter(a => !a.laudo_observacoes || a.laudo_observacoes.trim() === '').length;

        // Status dos animais
        const disponiveis = animais.filter(a => a.status_adocao === 'disponivel').length;
        const emProcesso = animais.filter(a => a.status_adocao === 'em_processo').length;
        const adotados = animais.filter(a => a.status_adocao === 'adotado').length;
        const larTemp = animais.filter(a => a.status_adocao === 'lar_temporario').length;

        document.getElementById('dash-disponiveis').textContent = disponiveis;
        document.getElementById('dash-processo').textContent = emProcesso;
        document.getElementById('dash-adotados').textContent = adotados;
        document.getElementById('dash-lar-temp').textContent = larTemp;

        // Alertas
        const alertsContainer = document.getElementById('dashboard-alerts');
        alertsContainer.innerHTML = '';

        if (animais.filter(a => {
            const dataResgate = new Date(a.data_resgate);
            const hoje = new Date();
            const diffTime = Math.abs(hoje - dataResgate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 90 && a.status_adocao === 'disponivel';
        }).length > 0) {
            alertsContainer.innerHTML += '<div class="alert-warning">⚠️ Animais aguardando adoção há mais de 3 meses</div>';
        }

        if (voluntarios.filter(v => v.status === 'pendente').length > 0) {
            alertsContainer.innerHTML += '<div class="alert-info">📋 Voluntários aguardando aprovação</div>';
        }

        if (matches.filter(m => m.status === 'pendente').length > 0) {
            alertsContainer.innerHTML += '<div class="alert-info">🧩 Matches aguardando confirmação</div>';
        }

        if (!alertsContainer.innerHTML) {
            alertsContainer.innerHTML = '<div class="alert-success">✅ Sistema funcionando normalmente</div>';
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dashboard', 'error');
    }
}