// ── CONFIGURAÇÃO ──
const API_BASE = 'http://localhost:3000/api/v1';
let animals = []; 
let volunteers = [];
let filterVolStatus = '';
let searchVolTerm = '';
let currentUser = null;

let selectedRisk = 'baixo';
let filterStatus = '';
let selectedRiskFilter = '';
let searchTerm = '';
let editingId = null;

document.addEventListener('DOMContentLoaded', initAdmin);

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
        await renderVoluntarios(); // Para atualizar badges
    } catch (err) {
        console.error('Erro ao validar sessão:', err);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// ── UTILS DE ESTILO ──
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

// ── CARREGAMENTO DE DADOS (READ) ──
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

        // Atualizar badge triagem
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
            
            // Mapeamento seguro para evitar "undefined"
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
        console.error("Erro ao carregar tabela:", err);
    }
}

// ── ATUALIZAR STATS DO ADMIN ──
function atualizarCardsStats(dados) {
    console.log("Calculando stats para:", dados.length, "animais");

    // 1. Total na sede (Tira quem já foi adotado)
    const ativos = dados.filter(a => (a.status_adocao || '').toLowerCase() !== 'adotado').length;
    
    // 2. Disponíveis p/ adoção (Status disponível e risco não crítico/grave)
    const disponiveis = dados.filter(a => 
        (a.status_adocao || '').toLowerCase() === 'disponivel' && 
        !['critico', 'grave'].includes((a.classificacao_risco || '').toLowerCase())
    ).length;

    // 3. Triagem Pendente (Animais sem classificação de risco definida)
    const triagem = dados.filter(a => !a.classificacao_risco || a.classificacao_risco === '').length;

    // 4. Cachorros Invisíveis (Estadia longa, ex: >= 90 dias)
    const invisiveis = dados.filter(a => (a.dias_sede || 0) >= 90).length;

    // INJEÇÃO NO HTML (Garante que os elementos existem antes de escrever)
    if(document.getElementById('stat-ativos')) document.getElementById('stat-ativos').innerText = ativos;
    if(document.getElementById('stat-disponiveis')) document.getElementById('stat-disponiveis').innerText = disponiveis;
    if(document.getElementById('stat-triagem')) document.getElementById('stat-triagem').innerText = triagem;
    if(document.getElementById('stat-invisiveis')) document.getElementById('stat-invisiveis').innerText = invisiveis;

    // Badge do menu lateral
    const badgeTriagem = document.getElementById('badge-triagem');
    if(badgeTriagem) badgeTriagem.innerText = triagem;

    // Capacidade Topbar
    const txtCapacidade = document.getElementById('txt-capacidade-topbar');
    if (txtCapacidade) {
        txtCapacidade.innerText = `Sede: ${ativos} / 30 animais`;
        const dot = document.getElementById('status-dot');
        if (dot) dot.style.background = ativos >= 30 ? '#fa5252' : '#40c057';
    }
}

// ── FILTROS E BUSCA ──
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

    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
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

// ── FORMULÁRIO ──
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

// ── SALVAR (POST/PUT) ──
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
    if (!confirm("Excluir permanentemente?")) return;
    try {
        await fetch(`${API_BASE}/animais/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        renderTable();
        showToast('🗑️', 'Removido', 'Registro excluído.');
    } catch (err) { console.error(err); }
}

function logoutAdmin() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function showToast(icon, title, sub) {
    const t = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-sub').textContent = sub;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── VOLUNTÁRIOS ──
async function renderVoluntarios() {
    console.log('renderVoluntarios called');
    const body = document.getElementById('table-voluntarios-body');
    console.log('body:', body);
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}/voluntarios`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (body) body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Não foi possível carregar os voluntários.</td></tr>';
            console.error('Erro ao buscar voluntários');
            return;
        }

        const resultado = await response.json();
        volunteers = resultado.dados || (Array.isArray(resultado) ? resultado : []);
        console.log('volunteers:', volunteers);

        let filteredData = volunteers.filter(v => {
            const matchS = !filterVolStatus || v.status_validacao === filterVolStatus;
            const nome = (v.nome || v.usuario_nome || '').toLowerCase();
            const email = (v.email || v.usuario_email || '').toLowerCase();
            const cpf = (v.cpf || '').toLowerCase();
            const matchQ = !searchVolTerm || 
                           nome.includes(searchVolTerm) || 
                           cpf.includes(searchVolTerm) ||
                           email.includes(searchVolTerm);
            return matchS && matchQ;
        });

        console.log('filteredData:', filteredData);

        const countEl = document.getElementById('count-voluntarios');
        if(countEl) countEl.textContent = `(${filteredData.length})`;
        
        const badgeVol = document.getElementById('badge-voluntarios');
        const pendingCount = volunteers.filter(v => v.status_validacao === 'pendente' || v.status_validacao === 'em_analise').length;
        if(badgeVol) {
            badgeVol.textContent = pendingCount > 0 ? pendingCount : '';
            badgeVol.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }

        if (!filteredData.length) {
            body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">🔍 Nenhum voluntário encontrado.</td></tr>`;
            return;
        }

        console.log('setting innerHTML');
        body.innerHTML = filteredData.map(v => {
            const statusMap = {
                'pendente': '<span class="status-badge" style="background:var(--warn-dim);color:var(--warn)">Pendente</span>',
                'em_analise': '<span class="status-badge" style="background:var(--info-dim);color:var(--info)">Em Análise</span>',
                'aprovado': '<span class="status-badge" style="background:var(--accent-dim);color:var(--accent)">Aprovado</span>',
                'aguardando_correcao': '<span class="status-badge" style="background:var(--orange-dim);color:var(--orange)">Aguardando Correção</span>',
                'reprovado': '<span class="status-badge" style="background:var(--danger-dim);color:var(--danger)">Reprovado</span>'
            };
            
            const moradiaFormatada = v.tipo_moradia ? v.tipo_moradia.replace(/_/g, ' ') : '';
            const nomeStr = v.nome || v.usuario_nome || 'Usuário Indefinido';
            const emailStr = v.email || v.usuario_email || 'N/A';
            
            return `
            <tr class="fade-in">
                <td>
                    <div style="font-weight:700;">${nomeStr}</div>
                    <div style="font-size:0.75rem; color:var(--muted);">${emailStr}</div>
                </td>
                <td style="font-family:monospace; font-size:0.85rem;">${v.cpf || 'N/A'}</td>
                <td style="text-transform: capitalize; font-size:0.85rem;">${moradiaFormatada}</td>
                <td>${statusMap[v.status_validacao] || v.status_validacao}</td>
                <td>
                    <div style="display:flex; gap:5px; font-size:0.75rem; color:var(--muted);">
                        <span style="color:${v.doc_rg_url ? 'var(--accent)' : 'inherit'}">RG</span> ·
                        <span style="color:${v.doc_comprovante_url ? 'var(--accent)' : 'inherit'}">Comp.</span> ·
                        <span style="color:${v.doc_antecedentes_url ? 'var(--accent)' : 'inherit'}">Ant.</span>
                    </div>
                </td>
                <td>
                    <button class="action-btn" onclick="openModalVoluntario(${v.id})">Validar</button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error("Erro ao carregar voluntários:", err);
        if (body) body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Erro ao processar os dados dos voluntários.</td></tr>';
    }
}

function filterVoluntarios() {
    const el = document.getElementById('filter-vol-status');
    if(el) filterVolStatus = el.value;
    renderVoluntarios();
}

function searchVoluntarios(term) {
    searchVolTerm = term.toLowerCase();
    renderVoluntarios();
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
        </tr>
    `).join('');
}

let currentVoluntarioId = null;

function openModalVoluntario(id) {
    currentVoluntarioId = id;
    const vol = volunteers.find(v => v.id === id);
    if (!vol) return;

    document.getElementById('voluntario-info').innerHTML = `
        <p><strong>Nome:</strong> ${vol.nome || vol.usuario_nome}</p>
        <p><strong>Email:</strong> ${vol.email || vol.usuario_email}</p>
        <p><strong>CPF:</strong> ${vol.cpf}</p>
        <p><strong>Moradia:</strong> ${vol.tipo_moradia}</p>
        <p><strong>Status Atual:</strong> ${vol.status_validacao}</p>
    `;

    // Resetar checkboxes
    document.getElementById('check-rg').checked = vol.check_rg_ok || false;
    document.getElementById('check-comprovante').checked = vol.check_comprovante_ok || false;
    document.getElementById('check-antecedentes').checked = vol.check_antecedentes_ok || false;
    document.getElementById('check-investigacao').checked = vol.check_investigacao_ok || false;
    document.getElementById('motivo-reprovacao').value = '';

    document.getElementById('modal-voluntario').style.display = 'block';
}

function closeModalVoluntario() {
    document.getElementById('modal-voluntario').style.display = 'none';
    currentVoluntarioId = null;
}

async function validarVoluntario(acao) {
    if (!currentVoluntarioId) return;

    const checkRg = document.getElementById('check-rg').checked;
    const checkComprovante = document.getElementById('check-comprovante').checked;
    const checkAntecedentes = document.getElementById('check-antecedentes').checked;
    const checkInvestigacao = document.getElementById('check-investigacao').checked;
    const motivo = document.getElementById('motivo-reprovacao').value;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/voluntarios/${currentVoluntarioId}/validar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                acao,
                check_rg_ok: checkRg,
                check_comprovante_ok: checkComprovante,
                check_antecedentes_ok: checkAntecedentes,
                check_investigacao_ok: checkInvestigacao,
                motivo_reprovacao: motivo
            })
        });
        
        if (response.ok) {
            showToast('✅', 'Sucesso', `Voluntário ${acao}!`);
            closeModalVoluntario();
            renderVoluntarios();
        } else {
            const data = await response.json();
            showToast('⚠️', 'Erro', data.erro || 'Erro ao validar voluntário');
        }
    } catch (err) {
        console.error('Erro ao validar voluntário:', err);
        showToast('🔴', 'Erro', 'Falha na comunicação com o servidor');
    }
}

// ── TRIAGEM MÉDICA ──
function renderTriagem() {
    const body = document.getElementById('table-triagem-body');
    if (!body) return;
    
    // Consideramos "Pendente de Triagem" animais sem laudo/observação preenchida
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
        </tr>
    `).join('');
}

let adotantes = [];
let matches = [];

// ── ADOTANTES ──
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
        adotantes = data.dados || (Array.isArray(data) ? data : []);

        const term = document.getElementById('search-adotantes')?.value?.toLowerCase() || '';
        const filtered = adotantes.filter(ad => {
            const nome = (ad.usuario_nome || ad.usuario_email || '').toLowerCase();
            return !term || nome.includes(term) || (ad.usuario_email || '').toLowerCase().includes(term);
        });

        document.getElementById('count-adotantes').textContent = `(${filtered.length})`;

        if (!filtered.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">🔍 Nenhum adotante encontrado no banco de dados.</td></tr>';
            return;
        }

        body.innerHTML = filtered.map(ad => `
            <tr class="fade-in">
                <td>
                  <div style="font-weight:700;">${ad.usuario_nome || 'Usuário Indefinido'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${ad.usuario_email || 'sem e-mail'}</div>
                </td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.tipo_moradia ? ad.tipo_moradia.replace(/_/g, ' ') : '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.experiencia_previa || '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.preferencia_especie || '-'}</td>
                <td style="text-transform:capitalize; font-size:0.85rem;">${ad.tempo_livre_diario_h || '-'}h</td>
            </tr>
        `).join('');
    } catch (e) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Não foi possível carregar os adotantes. Verifique o backend.</td></tr>';
        console.error(e);
    }
}

function searchAdotantes(term) {
    document.getElementById('search-adotantes').value = term;
    renderAdotantes();
}

// ── MATCHES ──
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
        matches = data.dados || (Array.isArray(data) ? data : []);

        if (!matches.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">🔍 Nenhum match encontrado.</td></tr>';
            return;
        }

        body.innerHTML = matches.map(m => `
            <tr class="fade-in">
                <td>
                  <div style="font-weight:700;">${m.animal_nome || '—'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${m.animal_codigo || ''} • ${m.animal_especie || ''}</div>
                </td>
                <td>
                  <div style="font-weight:700;">${m.adotante_nome || '—'}</div>
                  <div style="font-size:0.78rem; color:var(--muted);">${m.adotante_email || ''}</div>
                </td>
                <td style="font-family:monospace; font-size:0.92rem; font-weight:700;">${Number(m.score).toFixed(2)}%</td>
                <td style="text-transform:capitalize;">${m.status.replace('_', ' ')}</td>
                <td style="font-family:monospace; font-size:0.85rem;">${new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
            </tr>
        `).join('');
    } catch (e) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Falha ao carregar matches.</td></tr>';
        console.error(e);
    }
}

// ── TRANSPARÊNCIA ──
async function renderTransparencia() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/doacoes/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        document.getElementById('transp-ativos').textContent = data.animais_ativos || 0;
        document.getElementById('transp-disponiveis').textContent = data.disponiveis_adocao || 0;
        document.getElementById('transp-adotados').textContent = data.total_adotados || 0;
        document.getElementById('transp-invisiveis').textContent = data.cachorros_invisiveis || 0;
        document.getElementById('transp-lares-ativos').textContent = data.lares_ativos || 0;
        document.getElementById('transp-arrecadado-mes').textContent = `R$ ${Number(data.arrecadado_mes || 0).toFixed(2)}`;
    } catch (e) {
        console.error('Erro ao carregar painel de transparência:', e);
    }
}

// ── DOAÇÕES ──
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
            </tr>
        `).join('');
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
            showToast('✅', 'Sucesso', 'Doação confirmada!');
            renderDoacoes();
            renderTransparencia();
        } else {
            const data = await res.json();
            showToast('⚠️', 'Erro', data.erro || 'Não foi possível confirmar esta doação.');
        }
    } catch (e) {
        showToast('🔴', 'Erro', 'Falha na conexão com o servidor.');
        console.error(e);
    }
}

// ── NAVEGAÇÃO ENTRE TELAS ──
function setView(viewName) {
    console.log("Trocando para a view:", viewName);

    // 1. Esconde todas as seções de conteúdo
    // Certifique-se que no HTML suas divs tenham a classe 'view-section'
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });

    // 2. Mostra a seção desejada
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.style.display = 'block';
    } else {
        console.error(`Erro: Elemento 'view-${viewName}' não encontrado no HTML.`);
    }

    // 3. Gerencia os links do menu (ativa o item clicado)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Procura o link que tem o onclick da view atual
    const activeLink = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (activeLink) activeLink.classList.add('active');

    // 4. DISPARA A RENDERIZAÇÃO ESPECÍFICA
    // Isso é o que faz os dados aparecerem!
    switch (viewName) {
        case 'voluntarios':
            if (typeof renderVoluntarios === 'function') renderVoluntarios();
            break;
        case 'adotantes':
            if (typeof renderAdotantes === 'function') renderAdotantes();
            break;
        case 'matches':
            if (typeof renderMatches === 'function') renderMatches();
            break;
        case 'triagem':
            if (typeof renderTriagem === 'function') renderTriagem();
            break;
        case 'transparencia':
            if (typeof renderTransparencia === 'function') renderTransparencia();
            break;
        case 'doacoes':
            if (typeof renderDoacoes === 'function') renderDoacoes();
            break;
        case 'dashboard':
            if (typeof renderDashboard === 'function') renderDashboard();
            break;
        case 'config':
            if (typeof renderConfig === 'function') renderConfig();
            break;
        case 'animais':
            if (typeof renderTable === 'function') renderTable();
            break;
    }
}
