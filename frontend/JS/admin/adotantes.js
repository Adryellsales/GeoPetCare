async function renderAdotantes() {
    const body = document.getElementById('table-adotantes-body');
    if (!body) return;

    const token = localStorage.getItem('token');
    const filtro = document.getElementById('filter-adotantes')?.value;
    const query = filtro ? `?preferencia_especie=${encodeURIComponent(filtro)}` : '';

    try {
        const res = await fetch(`${API_BASE}/adotantes${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Falha ao buscar adotantes');

        const data = await res.json();
        // Garante que pegamos a lista de dados corretamente
        const listaAdotantes = data.dados || (Array.isArray(data) ? data : []);

        const term = document.getElementById('search-adotantes')?.value?.toLowerCase() || '';
        const filtered = listaAdotantes.filter(ad => {
            const nome = (ad.usuario_nome || ad.usuario_email || ad.nome || '').toLowerCase();
            const email = (ad.usuario_email || ad.email || '').toLowerCase();
            return !term || nome.includes(term) || email.includes(term);
        });

        const countElem = document.getElementById('count-adotantes');
        if (countElem) countElem.textContent = `(${filtered.length})`;

        if (!filtered.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">🔍 Nenhum adotante encontrado no banco de dados.</td></tr>';
            return;
        }

        body.innerHTML = filtered.map(ad => `
            <tr class="fade-in">
                <td>
                  <div style="font-weight:700;">${ad.usuario_nome || ad.nome || 'Usuário Indefinido'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${ad.usuario_email || ad.email || 'sem e-mail'}</div>
                </td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.tipo_moradia ? ad.tipo_moradia.replace(/_/g, ' ') : '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.experiencia_previa || '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.preferencia_especie || '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.tempo_livre_diario_h || '-'}h</td>
            </tr>`).join(''); // <-- O erro principal estava aqui: faltava o ")" antes do .join
    } catch (e) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Não foi possível carregar os adotantes. Verifique o backend.</td></tr>';
        console.error(e);
    }
}

function searchAdotantes(term) {
    const input = document.getElementById('search-adotantes');
    if (input) {
        input.value = term;
        renderAdotantes(); // Como é async, ela retorna uma promise, mas aqui funciona para disparar a atualização
    }
}