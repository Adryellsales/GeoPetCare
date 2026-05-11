async function renderMatches() {
    const body = document.getElementById('table-matches-body');
    if (!body) return;
    const token = localStorage.getItem('token');
    const status = document.getElementById('filter-matches')?.value;
    const query = status ? `?status=${encodeURIComponent(status)}` : '';

    try {
        const res = await fetch(`${API_BASE}/matches${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Falha ao buscar matches');

        const data = await res.json();
        // Garante que matches seja um array
        const listaMatches = data.dados || (Array.isArray(data) ? data : []);

        if (!listaMatches.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">🔍 Nenhum match encontrado.</td></tr>';
            return;
        }

        body.innerHTML = listaMatches.map(m => `
            <tr class="fade-in">
                <td>
                  <div style="font-weight:700;">${m.animal_nome || '—'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${m.animal_codigo || ''} • ${m.animal_especie || ''}</div>
                </td>
                <td>
                  <div style="font-weight:700;">${m.adotante_nome || '—'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${m.adotante_email || ''}</div>
                </td>
                <td style="font-family:monospace; font-size:0.92rem; font-weight:700;">${m.score ? Number(m.score).toFixed(2) : '0.00'}%</td>
                <td style="text-transform:capitalize;">${m.status ? m.status.replace('_', ' ') : 'Pendente'}</td>
                <td style="font-family:monospace; font-size:0.85rem;">${m.criado_em ? new Date(m.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>`).join(''); // <-- O parêntese foi adicionado antes do .join
    } catch (e) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Falha ao carregar matches.</td></tr>';
        console.error(e);
    }
}