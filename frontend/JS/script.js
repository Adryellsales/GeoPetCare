// Configuração da URL base da API
const API_BASE = 'http://localhost:3000/api/v1';

// ── INICIALIZAÇÃO ──
document.addEventListener('DOMContentLoaded', () => {
    carregarCatalogo();
    carregarDashboard();
});

// ── CARREGAR CATÁLOGO DE ANIMAIS ──
async function carregarCatalogo() {
    const grid = document.getElementById('lista-animais');
    
    try {
        const response = await fetch(`${API_BASE}/animais/catalogo`);
        const { dados } = await response.json();

        if (!dados || dados.length === 0) {
            grid.innerHTML = '<div class="empty-state">Nenhum pet disponível no momento.</div>';
            return;
        }

        grid.innerHTML = dados.map(animal => {
            // Se não houver foto, usamos um placeholder ou emoji
            const foto = animal.foto_principal || '';
            const bgStyle = foto ? `style="background-image: url('${foto}'); background-size: cover; background-position: center;"` : '';
            
            return `
                <div class="pet-tile fade-in" id="pet-tile-${animal.id}">
                    <div class="pet-tile-img" id="pet-img-${animal.id}" ${bgStyle}>
                        ${animal.invisivel ? '<span class="tile-invisible">★ Invisível</span>' : ''}
                        ${!foto ? `<span style="font-size:3rem">${animal.especie === 'gato' ? '🐈' : '🐕'}</span>` : ''}
                        <span class="tile-match" id="pet-match-${animal.id}" style="display: none;"></span>
                    </div>
                    <div class="pet-tile-body">
                        <div class="pet-tile-name">${animal.nome}</div>
                        <div class="pet-tile-desc">${animal.raca} · ${animal.porte}</div>
                        <div class="pet-tile-tags">
                            <span class="pet-tag">${animal.nivel_energia}</span>
                            <span class="pet-tag ${animal.vacinado ? 'green' : ''}">${animal.vacinado ? 'Vacinado' : 'Triagem'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
        grid.innerHTML = '<div class="empty-state">Erro ao conectar com o servidor.</div>';
    }
}

// ── CARREGAR DASHBOARD E STATS ATUALIZADO ──
async function carregarDashboard() {
    try {
        const response = await fetch(`${API_BASE}/doacoes/dashboard`);
        const dados = await response.json(); 

        // 1. Mapeamento das colunas da VIEW (incluindo as novas de custos)
        const arrecadado = dados.arrecadado_mes || 0;
        const ativos     = dados.animais_ativos || 0; 
        const lares      = dados.lares_ativos || 0;
        const totalAdotados = dados.total_adotados || 0;
        
        // Coletando os novos dados de despesas
        const custosVet = dados.custos_vet || 0;
        const custosAlimento = dados.custos_alimentacao || 0;

        // 2. Atualizar os números grandes (Seção STATS do topo)
        const totalHistorico = ativos + totalAdotados;
        
        if(document.getElementById('stat-resgatados')) {
            document.getElementById('stat-resgatados').innerText = totalHistorico;
        }
        if(document.getElementById('stat-lares')) {
            document.getElementById('stat-lares').innerText = lares;
        }
        if(document.getElementById('stat-arrecadado-total')) {
            document.getElementById('stat-arrecadado-total').innerText = `R$ ${arrecadado.toLocaleString('pt-BR')}`;
        }

        // 3. Atualizar o Dashboard de Transparência (Seção Inferior)
        if(document.getElementById('valor-arrecadado')) {
            // Valor arrecadado no mês
            document.getElementById('valor-arrecadado').innerText = `R$ ${arrecadado.toLocaleString('pt-BR')}`;
            
            // Texto de ocupação da sede
            document.getElementById('valor-ocupacao-texto').innerText = `${ativos} / 30`;
            
            // ATUALIZAÇÃO DOS CUSTOS: Injetando os novos valores do banco
            document.getElementById('valor-vet').innerText = `R$ ${custosVet.toLocaleString('pt-BR')}`;
            document.getElementById('valor-alimento').innerText = `R$ ${custosAlimento.toLocaleString('pt-BR')}`;
        }

        // 4. Atualizar Barra de Ocupação Visual
        const barra = document.getElementById('barra-ocupacao');
        const percTexto = document.getElementById('perc-ocupacao');
        if(barra) {
            const perc = Math.min((ativos / 30) * 100, 100);
            barra.style.width = `${perc}%`;
            if(percTexto) percTexto.innerText = `${Math.round(perc)}%`;
        }

    } catch (err) {
        console.error("Erro ao atualizar dashboard:", err);
    }
}

// ── MOTOR DE QUIZ (INTERATIVIDADE) ──
const quizState = {
    tipo_moradia: 'casa_com_quintal',
    experiencia_previa: 'iniciante',
    preferencia_especie: 'qualquer',
    preferencia_porte: 'qualquer',
    preferencia_energia: 'qualquer',
    possui_criancas: true,
    possui_outros_animais: true,
    tempo_livre_diario_h: 4,
};

function selectOpt(btn) {
    const group = btn.dataset.group;
    const value = btn.dataset.val;
    if (!group || value === undefined) return;

    document.querySelectorAll(`.quiz-opt[data-group="${group}"]`).forEach(o => o.classList.remove('active'));
    btn.classList.add('active');

    if (group === 'possui_criancas' || group === 'possui_outros_animais') {
        quizState[group] = value === '1';
    } else if (group === 'tempo_livre_diario_h') {
        quizState[group] = parseInt(value, 10) || 4;
    } else {
        quizState[group] = value;
    }

    // Auto-avança para a próxima pergunta após um breve delay visual
    setTimeout(() => {
        if (currentQuizStep < totalQuizSteps - 1) {
            nextQuestion();
        }
    }, 350);
}

let currentQuizStep = 0;
let totalQuizSteps = 0;

function abrirModalQuiz() {
    const modal = document.getElementById('quiz-modal');
    if (modal) {
        modal.classList.add('open');
        initQuizCarousel();
    }
}

function fecharModalQuiz() {
    const modal = document.getElementById('quiz-modal');
    if (modal) modal.classList.remove('open');
    closeMatchResults(); // Fecha os resultados caso o usuário decida refazer o quiz depois
}

function initQuizCarousel() {
    const questions = document.querySelectorAll('#quiz-form .quiz-question');
    totalQuizSteps = questions.length;
    currentQuizStep = 0;
    
    closeMatchResults();
    showQuizStep(currentQuizStep);
}

function showQuizStep(step) {
    const questions = document.querySelectorAll('#quiz-form .quiz-question');
    questions.forEach((q, index) => {
        if (index === step) {
            q.classList.add('active');
        } else {
            q.classList.remove('active');
        }
    });

    const counter = document.getElementById('quiz-step-counter');
    if (counter) counter.innerText = `Pergunta ${step + 1} de ${totalQuizSteps}`;

    const btnPrev = document.getElementById('btn-quiz-prev');
    const btnNext = document.getElementById('btn-quiz-next');
    const btnSubmit = document.getElementById('btn-quiz-submit');
    const navButtons = document.getElementById('quiz-nav-buttons');

    if (btnPrev) btnPrev.disabled = step === 0;

    if (step === totalQuizSteps - 1) {
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) btnSubmit.style.display = 'block';
    } else {
        if (btnNext) btnNext.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
    }
    
    if (navButtons) navButtons.style.display = 'flex';
}

function nextQuestion() {
    if (currentQuizStep < totalQuizSteps - 1) {
        currentQuizStep++;
        showQuizStep(currentQuizStep);
    }
}

function prevQuestion() {
    if (currentQuizStep > 0) {
        currentQuizStep--;
        showQuizStep(currentQuizStep);
    }
}

async function processarMatch() {
    const btn = document.getElementById('btn-quiz-submit');
    if (!btn) return;

    btn.disabled = true;
    btn.innerText = 'Analisando...';

    try {
        const response = await fetch(`${API_BASE}/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizState),
        });
        const data = await response.json();
        renderMatchResults(data);
    } catch (err) {
        console.error('Erro ao processar match:', err);
        renderMatchError('Não foi possível conectar com o servidor. Tente novamente em alguns segundos.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Ver meus matches →';
    }
}

function renderMatchResults(data) {
    const navButtons = document.getElementById('quiz-nav-buttons');
    const btnSubmit = document.getElementById('btn-quiz-submit');
    const counter = document.getElementById('quiz-step-counter');
    
    if (navButtons) navButtons.style.display = 'none';
    if (btnSubmit) btnSubmit.style.display = 'none';
    if (counter) counter.style.display = 'none';

    const results = document.getElementById('match-results');
    const list = document.getElementById('match-list');
    if (!results || !list) return;
    
    if (data && Array.isArray(data.matches)) {
        destacarMatchesNoCatalogo(data.matches);
    }

    if (!data || !Array.isArray(data.matches) || data.matches.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding:2rem; background: rgba(242, 236, 227, 0.9); border-radius: 20px;">
                <strong>${data?.mensagem || 'Nenhum match encontrado.'}</strong>
                <p style="margin-top:0.8rem; color: var(--mid);">Tente ajustar suas preferências ou responda novamente para receber novas recomendações.</p>
            </div>
        `;
    } else {
        list.innerHTML = data.matches.slice(0, 6).map(match => {
            const animal = match.animal;
            return `
                <div class="match-card">
                    <div class="match-card-header">
                        <div>
                            <h4>${animal.nome}</h4>
                            <span>${animal.raca || 'SRD'} · ${animal.porte}</span>
                        </div>
                        <span class="match-score">${match.score}%</span>
                    </div>
                    <p>${animal.especie} · Energia: ${animal.nivel_energia} · Risco: ${animal.classificacao_risco}</p>
                    <div class="match-tags">
                        <span>${animal.castrado ? 'Castrado' : 'Não castrado'}</span>
                        <span>${animal.vacinado ? 'Vacinado' : 'Pendente'}</span>
                        <span>${animal.compativel_criancas ? 'Para crianças' : 'Não para crianças'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    results.style.display = 'block';
    
    setTimeout(() => {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function renderMatchError(message) {
    const results = document.getElementById('match-results');
    const list = document.getElementById('match-list');
    if (!results || !list) return;

    list.innerHTML = `
        <div class="empty-state" style="padding:2rem; background: rgba(242, 236, 227, 0.9); border-radius: 20px;">
            <strong>Erro:</strong>
            <p style="margin-top:0.8rem; color: var(--mid);">${message}</p>
        </div>
    `;
    results.style.display = 'block';
}

function destacarMatchesNoCatalogo(matches) {
    // Oculta as marcações caso o usuário refaça o quiz
    document.querySelectorAll('.tile-match').forEach(badge => {
        badge.style.display = 'none';
    });

    // Busca os animais na seção "Pets" e injeta a porcentagem de cada um
    matches.forEach(match => {
        const badge = document.getElementById(`pet-match-${match.animal.id}`);
        if (badge) {
            badge.innerText = `${match.score}% Match`;
            badge.style.display = 'block';
        }
    });
}

function closeMatchResults() {
    const results = document.getElementById('match-results');
    if (results) results.style.display = 'none';
    
    const counter = document.getElementById('quiz-step-counter');
    if (counter) counter.style.display = 'block';
    
    showQuizStep(currentQuizStep);
}

// ── CADASTRO DE VOLUNTÁRIO ──
async function enviarCadastroVoluntario() {
    const nome = document.getElementById('vol-nome')?.value.trim();
    const email = document.getElementById('vol-email')?.value.trim();
    const senha = document.getElementById('vol-senha')?.value.trim();
    const cpf = document.getElementById('vol-cpf')?.value.trim();
    const moradia = document.getElementById('vol-moradia')?.value;

    const fileRg = document.getElementById('vol-doc-rg')?.files[0];
    const fileComprovante = document.getElementById('vol-doc-comprovante')?.files[0];
    const fileAntecedentes = document.getElementById('vol-doc-antecedentes')?.files[0];

    if (!nome || !email || !senha || !cpf || !moradia) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    if (cpf.length < 11) {
        alert('CPF inválido.');
        return;
    }

    try {
        // 1. Registrar novo usuário com perfil voluntario
        const regResponse = await fetch(`${API_BASE}/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, perfil: 'voluntario' }),
        });

        if (!regResponse.ok) {
            const err = await regResponse.json();
            alert(err.erro || 'Erro ao registrar usuário.');
            return;
        }

        const regData = await regResponse.json();
        const usuarioId = regData.usuario?.id;
        const token = regData.token;

        if (!usuarioId) {
            alert('Erro: ID do usuário não retornado.');
            return;
        }

        // 2. Salvar token para próximas requisições
        localStorage.setItem('token', token);

        // 3. Se houver arquivos, fazer upload (idealmente em FormData, mas por simplificação apenas registramos a intenção)
        // Para agora, apenas registramos a inscrição sem arquivos (backend pode solicitar depois)

        // 4. Registrar como voluntário
        const volResponse = await fetch(`${API_BASE}/voluntarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ cpf, tipo_moradia: moradia }),
        });

        if (!volResponse.ok) {
            const err = await volResponse.json();
            alert(err.erro || 'Erro ao registrar como voluntário.');
            return;
        }

        alert('✅ Cadastro enviado com sucesso! Aguarde a validação do administrador.');
        // Limpar formulário
        document.getElementById('vol-nome').value = '';
        document.getElementById('vol-email').value = '';
        document.getElementById('vol-senha').value = '';
        document.getElementById('vol-cpf').value = '';
        document.getElementById('vol-moradia').value = '';
        document.getElementById('vol-doc-rg').value = '';
        document.getElementById('vol-doc-comprovante').value = '';
        document.getElementById('vol-doc-antecedentes').value = '';

    } catch (err) {
        console.error('Erro ao enviar cadastro:', err);
        alert('Não foi possível enviar o cadastro. Tente novamente.');
    }
}

// ── DOAÇÕES ──
let valorDoacaoSelecionado = 30;
let metodoDoacaoSelecionado = 'pix';

function selecionarValorDoacao(btn) {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    valorDoacaoSelecionado = parseFloat(btn.dataset.valor);
    
    const inputOutro = document.getElementById('valor-outro');
    if (inputOutro) inputOutro.value = '';
}

function limparValorSelecionado() {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    valorDoacaoSelecionado = null;
}

function selecionarMetodoDoacao(btn) {
    document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    metodoDoacaoSelecionado = btn.dataset.metodo;
}

async function enviarDoacao() {
    const inputOutro = document.getElementById('valor-outro');
    if (inputOutro && inputOutro.value) {
        valorDoacaoSelecionado = parseFloat(inputOutro.value);
    }

    const recorrente = document.getElementById('doacao-recorrente')?.checked || false;

    if (!valorDoacaoSelecionado || valorDoacaoSelecionado <= 0) {
        alert('Por favor, selecione ou insira um valor válido para a doação.');
        return;
    }

    const btn = document.querySelector('.donate-final-btn');
    const originalText = btn ? btn.innerText : 'Contribuir Agora 🐾';

    try {
        if (btn) {
            btn.innerText = 'Processando...';
            btn.disabled = true;
        }

        const response = await fetch(`${API_BASE}/doacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                valor: valorDoacaoSelecionado,
                metodo: metodoDoacaoSelecionado,
                recorrente: recorrente
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            abrirModalDoacao('Erro na Doação', data.erro || 'Erro ao processar doação.', '⚠️');
        } else {
            let msg = data.mensagem;
            if (data.instrucao) {
                msg += '<br><br>' + data.instrucao;
            }
            
            let extraHtml = '';
            if (metodoDoacaoSelecionado === 'pix' && data.pix_copia_cola) {
                extraHtml = `
                    <div style="font-size: 0.85rem; color: var(--mid); margin-bottom: 0.4rem; font-weight: 600;">Código Pix Copia e Cola (Simulação)</div>
                    <div style="background: rgba(255,255,255,0.7); padding: 0.8rem; border-radius: 8px; word-break: break-all; font-family: monospace; color: var(--dark); user-select: all;">${data.pix_copia_cola}</div>
                `;
            }

            abrirModalDoacao('Apoio Registrado!', msg, '💖', extraHtml);
        }
    } catch (err) {
        console.error('Erro ao enviar doação:', err);
        abrirModalDoacao('Erro de Conexão', 'Não foi possível processar a doação. Tente novamente mais tarde.', '🔌');
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

function abrirModalDoacao(titulo, texto, emoji, extraHtml = '') {
    const modal = document.getElementById('doacao-modal');
    if (!modal) return;

    document.getElementById('modal-doacao-title').innerText = titulo;
    document.getElementById('modal-doacao-text').innerHTML = texto;
    document.getElementById('modal-doacao-emoji').innerText = emoji || '❤️';
    
    const extraContainer = document.getElementById('modal-doacao-extra');
    if (extraHtml) {
        extraContainer.innerHTML = extraHtml;
        extraContainer.style.display = 'block';
    } else {
        extraContainer.innerHTML = '';
        extraContainer.style.display = 'none';
    }

    modal.classList.add('open');
}

function fecharModalDoacao() {
    const modal = document.getElementById('doacao-modal');
    if (modal) modal.classList.remove('open');
}