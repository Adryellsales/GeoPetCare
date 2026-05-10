async function renderVoluntarios() {
    const body = document.getElementById('table-voluntarios-body');
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

        const countEl = document.getElementById('count-voluntarios');
        if (countEl) countEl.textContent = `(${filteredData.length})`;

        const badgeVol = document.getElementById('badge-voluntarios');
        const pendingCount = volunteers.filter(v => v.status_validacao === 'pendente' || v.status_validacao === 'em_analise').length;
        if (badgeVol) {
            badgeVol.textContent = pendingCount > 0 ? pendingCount : '';
            badgeVol.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }

        if (!filteredData.length) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">🔍 Nenhum voluntário encontrado.</td></tr>';
            return;
        }

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
                    <div style="display:flex; gap: 8px;">
                        <button class="action-btn" onclick="openModalVoluntario(${v.id})">Validar</button>
                        <button class="action-btn" onclick="editVoluntario(${v.id})">✏️</button>
                        <button class="action-btn danger" onclick="removeVoluntario(${v.id})">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Erro ao carregar voluntários:', err);
        if (body) body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--warn)">⚠️ Erro ao processar os dados dos voluntários.</td></tr>';
    }
}

function filterVoluntarios() {
    const el = document.getElementById('filter-vol-status');
    if (el) filterVolStatus = el.value;
    renderVoluntarios();
}

function searchVoluntarios(term) {
    searchVolTerm = term.toLowerCase();
    renderVoluntarios();
}

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

// ── FORMULÁRIO (CRUD) ──
let editingVoluntarioId = null;

function openVoluntarioForm() {
    editingVoluntarioId = null;
    const title = document.getElementById('form-voluntario-title');
    if (title) title.textContent = '🤝 Novo Voluntário';
    clearVoluntarioForm();
    const panel = document.getElementById('form-panel-voluntario');
    if (panel) panel.classList.add('open');
}

function closeVoluntarioForm() {
    const panel = document.getElementById('form-panel-voluntario');
    if (panel) panel.classList.remove('open');
}

function clearVoluntarioForm() {
    const ids = ['vol-field-cpf', 'vol-field-moradia', 'vol-field-usuario-id'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.value = el.options[0]?.value || '';
            } else {
                el.value = '';
            }
        }
    });
}

async function saveVoluntario() {
    const cpf = document.getElementById('vol-field-cpf')?.value.trim();
    const tipo_moradia = document.getElementById('vol-field-moradia')?.value;
    const usuario_id = document.getElementById('vol-field-usuario-id')?.value; // Necessário caso o admin crie o voluntário

    if (!cpf || !tipo_moradia) {
        showToast('⚠️', 'Campo Obrigatório', 'CPF e Moradia são necessários.');
        return;
    }

    const data = { cpf, tipo_moradia, usuario_id };
    const token = localStorage.getItem('token');
    const url = editingVoluntarioId ? `${API_BASE}/voluntarios/${editingVoluntarioId}` : `${API_BASE}/voluntarios`;
    const method = editingVoluntarioId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        const resJson = await res.json();

        if (res.ok) {
            showToast('✅', 'Sucesso!', editingVoluntarioId ? 'Voluntário atualizado com sucesso.' : 'Voluntário cadastrado com sucesso.');
            renderVoluntarios();
            closeVoluntarioForm();
            editingVoluntarioId = null;
        } else {
            showToast('🔴', 'Erro', resJson.erro || 'Falha ao salvar.');
        }
    } catch (err) {
        showToast('🔴', 'Erro de Conexão', 'Servidor offline.');
    }
}

function editVoluntario(id) {
    const v = volunteers.find(x => x.id === id);
    if (!v) return;
    editingVoluntarioId = id;
    
    const title = document.getElementById('form-voluntario-title');
    if (title) title.textContent = `✏️ Editar — ${v.nome || v.usuario_nome || 'Voluntário'}`;
    
    const elCpf = document.getElementById('vol-field-cpf');
    if (elCpf) elCpf.value = v.cpf || '';
    
    const elMoradia = document.getElementById('vol-field-moradia');
    if (elMoradia) elMoradia.value = v.tipo_moradia || 'casa_com_quintal';
    
    const elUsuario = document.getElementById('vol-field-usuario-id');
    if (elUsuario) elUsuario.value = v.usuario_id || '';

    const panel = document.getElementById('form-panel-voluntario');
    if (panel) panel.classList.add('open');
}

async function removeVoluntario(id) {
    const token = localStorage.getItem('token');
    if (!confirm('Excluir permanentemente este voluntário?')) return;
    try {
        const res = await fetch(`${API_BASE}/voluntarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            renderVoluntarios();
            showToast('🗑️', 'Removido', 'Voluntário excluído com sucesso.');
        } else {
            const resJson = await res.json();
            showToast('🔴', 'Erro', resJson.erro || 'Falha ao excluir.');
        }
    } catch (err) {
        console.error(err);
        showToast('🔴', 'Erro de Conexão', 'Servidor offline.');
    }
}
