async function renderTable() {
    const body = document.getElementById('table-body');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}/animais`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        const resultado = await response.json();
        animals = resultado.dados || [];

        atualizarCardsStats(animals);

        let filteredData = animals.filter(a => {
            const matchS = !filterStatus || a.status_adocao === filterStatus;
            const matchR = !selectedRiskFilter || a.classificacao_risco === selectedRiskFilter;
            const matchQ = !searchTerm ||
                           a.nome.toLowerCase().includes(searchTerm) ||
                           a.codigo.toLowerCase().includes(searchTerm);
            return matchS && matchR && matchQ;
        });

        document.getElementById('count-badge').textContent = `(${filteredData.length})`;
        document.getElementById('badge-total-animais').textContent = animals.length;

        const pendentesTriagem = animals.filter(a => !a.laudo_observacoes || a.laudo_observacoes.trim() === '').length;
        const badgeTriagem = document.getElementById('badge-triagem');
        if (badgeTriagem) {
            badgeTriagem.textContent = pendentesTriagem > 0 ? pendentesTriagem : '';
            badgeTriagem.style.display = pendentesTriagem > 0 ? 'inline-block' : 'none';
        }

        if (!filteredData.length) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">🔍 Nenhum animal encontrado.</td></tr>`;
            return;
        }

        body.innerHTML = filteredData.map(a => {
            const emoji = a.especie?.toLowerCase() === 'gato' ? '🐱' : '🐶';
            const rVal = a.classificacao_risco || 'baixo';
            const sVal = a.status_adocao || 'disponivel';

            return `
            <tr class="fade-in">
                <td><span class="animal-id">${a.codigo}</span></td>
                <td>
                    <div class="animal-name-cell">
                        <div class="animal-avatar" style="background:${avatarBg(a.especie)}">${emoji}</div>
                        <div>
                            <div class="animal-name">${a.nome} ${a.dias_sede >= 90 ? `<span class="invisible-tag">★</span>` : ''}</div>
                            <div class="animal-breed">${a.raca} · ${a.especie}</div>
                        </div>
                    </div>
                </td>
                <td><span class="risk-badge ${riskClass(rVal)}">${rVal}</span></td>
                <td><span class="status-badge ${statusClass(sVal)}">${sVal.replace('_', ' ')}</span></td>
                <td style="color:var(--muted);font-size:0.85rem; text-transform: capitalize;">${a.porte}</td>
                <td style="font-family:monospace;">${a.dias_sede || 0}d</td>
                <td>
                    <div style="display:flex; gap: 8px;">
                        <button class="action-btn" onclick="editAnimal(${a.id})">✏️</button>
                        <button class="action-btn danger" onclick="removeAnimal(${a.id})">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Erro ao carregar tabela:', err);
    }
}

function atualizarCardsStats(dados) {
    const ativos = dados.filter(a => (a.status_adocao || '').toLowerCase() !== 'adotado').length;
    const disponiveis = dados.filter(a =>
        (a.status_adocao || '').toLowerCase() === 'disponivel' &&
        !['critico', 'grave'].includes((a.classificacao_risco || '').toLowerCase())
    ).length;
    const triagem = dados.filter(a => !a.classificacao_risco || a.classificacao_risco === '').length;
    const invisiveis = dados.filter(a => (a.dias_sede || 0) >= 90).length;

    if(document.getElementById('stat-ativos')) document.getElementById('stat-ativos').innerText = ativos;
    if(document.getElementById('stat-disponiveis')) document.getElementById('stat-disponiveis').innerText = disponiveis;
    if(document.getElementById('stat-triagem')) document.getElementById('stat-triagem').innerText = triagem;
    if(document.getElementById('stat-invisiveis')) document.getElementById('stat-invisiveis').innerText = invisiveis;

    const badgeTriagem = document.getElementById('badge-triagem');
    if (badgeTriagem) badgeTriagem.innerText = triagem;

    const txtCapacidade = document.getElementById('txt-capacidade-topbar');
    if (txtCapacidade) {
        txtCapacidade.innerText = `Sede: ${ativos} / 30 animais`;
        const dot = document.getElementById('status-dot');
        if (dot) dot.style.background = ativos >= 30 ? '#fa5252' : '#40c057';
    }
}

function filterTable() {
    filterStatus = document.getElementById('filter-status').value;
    selectedRiskFilter = document.getElementById('filter-risco').value;
    renderTable();
}

function searchTable(v) {
    searchTerm = v.toLowerCase();
    renderTable();
}

function exportarCSV() {
    const rows = animals.map(a => ({
        codigo: a.codigo,
        nome: a.nome,
        especie: a.especie,
        raca: a.raca,
        porte: a.porte,
        classificacao_risco: a.classificacao_risco,
        status_adocao: a.status_adocao,
        data_resgate: a.data_resgate,
        dias_sede: a.dias_sede,
    }));

    if (!rows.length) {
        showToast('⚠️', 'Nada para exportar', 'Não há registros para exportar no momento.');
        return;
    }

    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geopetcare_animais_${new Date().toISOString().slice(0,10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('✅', 'Exportado', 'CSV gerado com sucesso.');
}

function openForm() {
    editingId = null;
    document.getElementById('form-panel-title').textContent = '🐾 Novo Resgate';
    clearForm();
    document.getElementById('form-panel').classList.add('open');
}

function closeForm() {
    document.getElementById('form-panel').classList.remove('open');
}

function clearForm() {
    const ids = ['field-nome','field-especie','field-raca','field-porte','field-idade','field-energia','field-data-resgate','field-criancas','field-outros-animais','field-laudo','field-codigo'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            el.value = el.options[0]?.value || '';
        } else if (el.type === 'date') {
            el.value = new Date().toISOString().slice(0, 10);
        } else {
            el.value = '';
        }
    });
    selectRisk('baixo');
    document.getElementById('check-castrado').checked = false;
    document.getElementById('check-vacinado').checked = false;
    document.getElementById('check-especial').checked = false;
}

function selectRisk(risk) {
    selectedRisk = risk.toLowerCase();
    document.querySelectorAll('.risk-opt').forEach(b => {
        b.classList.toggle('selected', b.dataset.risk.toLowerCase() === selectedRisk);
    });
}

async function saveAnimal() {
    const nome = document.getElementById('field-nome').value.trim();
    if (!nome) {
        showToast('⚠️', 'Campo Obrigatório', 'O nome é necessário.');
        return;
    }

    const animalData = {
        microchip: document.getElementById('field-codigo').value.trim() || null,
        nome: nome,
        especie: document.getElementById('field-especie').value,
        raca: document.getElementById('field-raca').value || 'SRD',
        idade_estimada: document.getElementById('field-idade').value.trim() || null,
        data_resgate: document.getElementById('field-data-resgate').value || new Date().toISOString().split('T')[0],
        classificacao_risco: selectedRisk,
        laudo_observacoes: document.getElementById('field-laudo').value || null,
        nivel_energia: document.getElementById('field-energia').value || 'moderado',
        porte: document.getElementById('field-porte').value,
        castrado: document.getElementById('check-castrado').checked ? 1 : 0,
        vacinado: document.getElementById('check-vacinado').checked ? 1 : 0,
        necessidades_especiais: document.getElementById('check-especial').checked ? 1 : 0,
        compativel_criancas: document.getElementById('field-criancas').value === '1' ? 1 : 0,
        compativel_outros_animais: document.getElementById('field-outros-animais').value === '1' ? 1 : 0,
    };

    try {
        const token = localStorage.getItem('token');
        const url = editingId ? `${API_BASE}/animais/${editingId}` : `${API_BASE}/animais`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(animalData)
        });

        const resJson = await response.json();

        if (response.ok) {
            const action = editingId ? 'Atualizado' : 'Cadastrado';
            showToast('✅', 'Sucesso!', `${action} com sucesso.`);
            renderTable();
            closeForm();
            editingId = null;
        } else {
            showToast('🔴', 'Erro', resJson.erro || 'Falha ao salvar.');
        }
    } catch (err) {
        showToast('🔴', 'Erro de Conexão', 'Servidor offline.');
    }
}

function editAnimal(id) {
    const a = animals.find(x => x.id === id);
    if (!a) return;
    editingId = id;
    document.getElementById('form-panel-title').textContent = `✏️ Editar — ${a.nome}`;
    document.getElementById('field-nome').value = a.nome;
    document.getElementById('field-codigo').value = a.codigo;
    document.getElementById('field-raca').value = a.raca;
    document.getElementById('field-especie').value = a.especie;
    document.getElementById('field-porte').value = a.porte;
    document.getElementById('field-idade').value = a.idade_estimada || '';
    document.getElementById('field-data-resgate').value = a.data_resgate || new Date().toISOString().slice(0, 10);
    document.getElementById('field-energia').value = a.nivel_energia || 'moderado';
    document.getElementById('field-criancas').value = a.compativel_criancas === 1 ? '1' : '0';
    document.getElementById('field-outros-animais').value = a.compativel_outros_animais === 1 ? '1' : '0';
    document.getElementById('field-laudo').value = a.laudo_observacoes || '';
    document.getElementById('check-castrado').checked = a.castrado === 1;
    document.getElementById('check-vacinado').checked = a.vacinado === 1;
    document.getElementById('check-especial').checked = a.necessidades_especiais === 1;
    selectRisk(a.classificacao_risco || 'baixo');
    document.getElementById('form-panel').classList.add('open');
}

async function removeAnimal(id) {
    const token = localStorage.getItem('token');
    if (!confirm('Excluir permanentemente?')) return;
    try {
        await fetch(`${API_BASE}/animais/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        renderTable();
        showToast('🗑️', 'Removido', 'Registro excluído.');
    } catch (err) {
        console.error(err);
    }
}
