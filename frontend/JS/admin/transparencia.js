async function renderTransparencia() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/doacoes/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // Atualiza os cards de resumo
        if (document.getElementById('transp-ativos')) document.getElementById('transp-ativos').textContent = data.animais_ativos || 0;
        if (document.getElementById('transp-disponiveis')) document.getElementById('transp-disponiveis').textContent = data.disponiveis_adocao || 0;
        if (document.getElementById('transp-adotados')) document.getElementById('transp-adotados').textContent = data.total_adotados || 0;
        if (document.getElementById('transp-invisiveis')) document.getElementById('transp-invisiveis').textContent = data.cachorros_invisiveis || 0;
        if (document.getElementById('transp-lares-ativos')) document.getElementById('transp-lares-ativos').textContent = data.lares_ativos || 0;
        if (document.getElementById('transp-arrecadado-mes')) document.getElementById('transp-arrecadado-mes').textContent = `R$ ${Number(data.arrecadado_mes || 0).toFixed(2)}`;
    } catch (e) {
        console.error('Erro ao carregar painel de transparência:', e);
    }
}

async function renderDoacoes() {
    const body = document.getElementById('table-doacoes-body');
    if (!body) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/doacoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Falha ao buscar doações');
        const data = await res.json();
        const doacoes = data.dados || (Array.isArray(data) ? data : []);

        if (!doacoes.length) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">🔍 Nenhuma doação registrada.</td></tr>';
            return;
        }

        body.innerHTML = doacoes.map(d => `
            <tr class="fade-in">
                <td style="font-family:monospace; font-size:0.85rem;">${new Date(d.criado_em).toLocaleDateString('pt-BR')}</td>
                <td><div style="font-weight:700;">${d.usuario_nome || 'Apoiador Anônimo'}</div></td>
                <td style="color:var(--accent); font-weight:800;">R$ ${Number(d.valor).toFixed(2)}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${d.metodo}</td>
                <td><span class="status-badge" style="background:${d.status === 'confirmado' ? 'var(--accent-dim)' : 'var(--warn-dim)'}; color:${d.status === 'confirmado' ? 'var(--accent)' : 'var(--warn)'}">${d.status}</span></td>
                <td>
                    ${d.status === 'pendente' ? `<button class="action-btn" onclick="confirmarDoacao(${d.id})">Confirmar Pagamento</button>` : '-'}
                </td>
            </tr>`).join(''); // <-- Adicionado o ")" antes do .join
    } catch (e) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Falha ao carregar doações.</td></tr>';
        console.error(e);
    }
}

async function confirmarDoacao(id) {
    if (!confirm('Tem certeza que deseja confirmar o recebimento desta doação?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/doacoes/${id}/confirmar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (typeof showToast === "function") {
                showToast('✅', 'Sucesso', 'Doação confirmada!');
            } else {
                alert('Doação confirmada!');
            }
            renderDoacoes();
            renderTransparencia();
        } else {
            const data = await res.json();
            alert(data.erro || 'Não foi possível confirmar esta doação.');
        }
    } catch (e) {
        alert('Falha na conexão com o servidor.');
        console.error(e);
    }
}