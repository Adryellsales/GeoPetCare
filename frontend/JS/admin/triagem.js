function renderTriagem() {
    const body = document.getElementById('table-triagem-body');
    if (!body) return;

    const pendentes = animals.filter(a => !a.laudo_observacoes || a.laudo_observacoes.trim() === '');

    if (!pendentes.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;">✅ Nenhuma triagem pendente no momento.</td></tr>';
        return;
    }

    body.innerHTML = pendentes.map(a => `
        <tr class="fade-in">
            <td style="font-family:monospace; font-size:0.85rem;">${a.codigo}</td>
            <td>
                <div style="font-weight:700;">${a.nome}</div>
                <div style="font-size:0.75rem; color:var(--muted);">${a.raca} · ${a.especie}</div>
            </td>
            <td style="font-family:monospace; font-size:0.85rem;">${new Date(a.data_resgate).toLocaleDateString('pt-BR')}</td>
            <td><button class="action-btn primary" onclick="editAnimal(${a.id}); setView('animais');">Preencher Laudo</button></td>
        </tr>`).join(''); // <-- O erro estava bem aqui no fechamento: `).join('')`
}

function filterTriagem() {
    const filtro = document.getElementById('filter-triagem')?.value;
    if (!filtro) {
        renderTriagem();
        return;
    }

    const body = document.getElementById('table-triagem-body');
    if (!body) return;

    const pendentes = animals
        .filter(a => !a.laudo_observacoes || a.laudo_observacoes.trim() === '')
        .filter(a => !filtro || a.classificacao_risco === filtro);

    if (!pendentes.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;">✅ Nenhum animal de triagem com esse risco.</td></tr>';
        return;
    }

    body.innerHTML = pendentes.map(a => `
        <tr class="fade-in">
            <td style="font-family:monospace; font-size:0.85rem;">${a.codigo}</td>
            <td>
                <div style="font-weight:700;">${a.nome}</div>
                <div style="font-size:0.75rem; color:var(--muted);">${a.raca} · ${a.especie}</div>
            </td>
            <td style="font-family:monospace; font-size:0.85rem;">${a.classificacao_risco}</td>
            <td style="font-family:monospace; font-size:0.85rem;">${new Date(a.data_resgate).toLocaleDateString('pt-BR')}</td>
            <td><button class="action-btn primary" onclick="editAnimal(${a.id}); setView('animais');">Preencher Laudo</button></td>
        </tr>`).join(''); // <-- E aqui também: `).join('')`
}