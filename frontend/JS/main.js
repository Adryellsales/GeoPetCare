// ══════════════════════════════════════════════════════════════
//  GEO Pet Care — main.js
//  Front-end principal integrado com API Node/MySQL
// ══════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3000/api/v1';

// Mapeamento de bg-class por espécie/índice
const BG_CLASSES = ['terra-bg', 'sage-bg', 'sky-bg', 'blush-bg'];
const EMOJI_MAP  = { gato: '🐈', cachorro: '🐕', default: '🐾' };

// ── Estado da doação ──────────────────────────────────────────
let valorDoacaoSelecionado = 50;
let metodoDoacaoSelecionado = 'pix';

// ══════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  carregarCatalogo();
  carregarDashboard();
});

// ══════════════════════════════════════════════════════════════
//  CATÁLOGO DE ANIMAIS (API → Grid de cards)
// ══════════════════════════════════════════════════════════════
async function carregarCatalogo() {
  const grid = document.getElementById('petsGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state">🐾 Buscando animais disponíveis...</div>';

  try {
    const response = await fetch(`${API_BASE}/animais/catalogo`);
    const { dados } = await response.json();

    if (!dados || dados.length === 0) {
      grid.innerHTML = '<div class="empty-state">Nenhum pet disponível no momento.</div>';
      return;
    }

    grid.innerHTML = dados.map((animal, i) => {
      const bgClass  = BG_CLASSES[i % BG_CLASSES.length];
      const emoji    = EMOJI_MAP[animal.especie] || EMOJI_MAP.default;
      const badgeHtml = animal.invisivel
        ? '<span class="pet-badge badge-invisible">Invisível</span>'
        : (i === 0 ? '<span class="pet-badge badge-new">Novo</span>' : '');

      // Tags de personalidade
      const tags = [animal.nivel_energia, animal.vacinado ? 'Vacinado ✓' : 'Em triagem']
        .filter(Boolean)
        .map(t => `<span class="pet-tag">${t}</span>`)
        .join('');

      return `
        <div class="pet-card"
             data-type="${animal.especie === 'gato' ? 'gatos' : 'cachorros'}"
             ${animal.invisivel ? 'data-invisible="true"' : ''}>
          <div class="pet-img ${bgClass}">
            ${emoji}
            ${badgeHtml}
          </div>
          <div class="pet-info">
            <h3>${animal.nome}</h3>
            <div class="pet-meta">
              <span>${animal.especie === 'gato' ? '🐱 Gato' : '🐶 Cachorro'}</span>
              <span>⚖ ${animal.porte || 'Médio'}</span>
              ${animal.raca ? `<span>🐾 ${animal.raca}</span>` : ''}
            </div>
            <div class="pet-tags">${tags}</div>
            <div class="pet-match">
              <span style="font-size:.8rem;color:#7a5c42">match</span>
              <div class="match-bar-wrap">
                <div class="match-bar" id="match-bar-${animal.id}" style="width:0%"></div>
              </div>
              <span class="match-pct" id="match-pct-${animal.id}">—</span>
            </div>
            <button class="btn-primary pet-btn"
                    onclick="registrarInteresse(${animal.id}, '${animal.nome}')">
              Tenho interesse
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar catálogo:', err);
    grid.innerHTML = '<div class="empty-state">Erro ao conectar com o servidor. Verifique se a API está rodando.</div>';
  }
}

// ── Registrar interesse em adotar ────────────────────────────
function registrarInteresse(animalId, nome) {
  showToast(`💛 Interesse em ${nome} registrado! Em breve entraremos em contato.`);
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD DE TRANSPARÊNCIA (API → Cards de dados reais)
// ══════════════════════════════════════════════════════════════
async function carregarDashboard() {
  try {
    const response = await fetch(`${API_BASE}/doacoes/dashboard`);
    const dados    = await response.json();

    const arrecadado   = dados.arrecadado_mes   || 0;
    const ativos       = dados.animais_ativos    || 0;
    const lares        = dados.lares_ativos      || 0;
    const totalAdotados= dados.total_adotados    || 0;
    const custosVet    = dados.custos_vet        || 0;
    const custosAlim   = dados.custos_alimentacao|| 0;

    // Estatísticas hero
    setInner('stat-resgatados',     ativos + totalAdotados);
    setInner('stat-lares',          lares);
    setInner('stat-arrecadado',     `R$ ${arrecadado.toLocaleString('pt-BR')}`);

    // Cards de transparência
    setInner('dash-arrecadado',     `R$ ${arrecadado.toLocaleString('pt-BR')}`);
    setInner('dash-vet',            `R$ ${custosVet.toLocaleString('pt-BR')}`);
    setInner('dash-alimento',       `R$ ${custosAlim.toLocaleString('pt-BR')}`);
    setInner('dash-lares',          lares);
    setInner('dash-adocoes',        totalAdotados);

    // Cálculo da taxa de devolução (placeholder, pois API não expõe esse campo)
    setInner('dash-devolucao', '6%');

    // Gráfico de barras com dados reais do mês
    atualizarGrafico(arrecadado, custosVet + custosAlim);

  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

function setInner(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function atualizarGrafico(arrecadado, despesas) {
  // Atualiza a última barra (mês atual) com dados reais;
  // os outros meses são ilustrativos.
  const bars = document.querySelectorAll('.bar-col');
  if (!bars.length) return;

  const maxVal = Math.max(arrecadado, despesas, 1);
  const lastBar = bars[bars.length - 1];
  if (!lastBar) return;

  const incomeBar  = lastBar.querySelector('.bar.income');
  const expenseBar = lastBar.querySelector('.bar.expense');
  if (incomeBar)  incomeBar.style.height  = `${Math.round((arrecadado / maxVal) * 110)}px`;
  if (expenseBar) expenseBar.style.height = `${Math.round((despesas   / maxVal) * 110)}px`;
}

// ══════════════════════════════════════════════════════════════
//  FILTRO DE PETS
// ══════════════════════════════════════════════════════════════
function filterPets(type, btn) {
  if (btn) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }
  document.querySelectorAll('.pet-card').forEach(card => {
    if (type === 'todos')      card.style.display = 'block';
    else if (type === 'invisible') card.style.display = card.dataset.invisible ? 'block' : 'none';
    else                       card.style.display = card.dataset.type === type ? 'block' : 'none';
  });
}

// ══════════════════════════════════════════════════════════════
//  DOAÇÕES (integrado com API)
// ══════════════════════════════════════════════════════════════
function selectAmount(btn, val) {
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  valorDoacaoSelecionado = val;
  const confirmBtn = document.getElementById('btn-confirmar-doacao');
  if (confirmBtn) {
    confirmBtn.textContent = val > 0
      ? `Confirmar doação de R$ ${val} →`
      : 'Confirmar doação →';
  }
}

function selectPay(btn) {
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  metodoDoacaoSelecionado = btn.dataset.metodo || 'pix';
}

async function processDonation() {
  if (!valorDoacaoSelecionado || valorDoacaoSelecionado <= 0) {
    showToast('⚠️ Selecione um valor para a doação.');
    return;
  }

  const recorrente = document.getElementById('recorrente')?.checked || false;
  const btn = document.getElementById('btn-confirmar-doacao');

  try {
    if (btn) { btn.textContent = 'Processando...'; btn.disabled = true; }

    const response = await fetch(`${API_BASE}/doacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor: valorDoacaoSelecionado,
        metodo: metodoDoacaoSelecionado,
        recorrente,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(`⚠️ ${data.erro || 'Erro ao processar doação.'}`);
    } else {
      let msg = `✅ ${data.mensagem || 'Doação registrada com sucesso!'}`;
      if (data.pix_copia_cola) {
        msg += ' Código Pix copiado para a área de transferência.';
        try { navigator.clipboard.writeText(data.pix_copia_cola); } catch (_) {}
      }
      showToast(msg);
      // Recarrega o dashboard para refletir nova doação
      setTimeout(carregarDashboard, 1500);
    }

  } catch (err) {
    console.error('Erro ao enviar doação:', err);
    showToast('🔌 Erro de conexão. Verifique se a API está rodando.');
  } finally {
    if (btn) {
      btn.textContent = `Confirmar doação de R$ ${valorDoacaoSelecionado} →`;
      btn.disabled = false;
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  CADASTRO DE VOLUNTÁRIO (integrado com API)
// ══════════════════════════════════════════════════════════════
async function enviarCadastroVoluntario() {
  const nome    = document.getElementById('vol-nome')?.value.trim();
  const email   = document.getElementById('vol-email')?.value.trim();
  const senha   = document.getElementById('vol-senha')?.value.trim();
  const cpf     = document.getElementById('vol-cpf')?.value.trim();
  const moradia = document.getElementById('vol-moradia')?.value;

  if (!nome || !email || !senha || !cpf || !moradia) {
    showToast('⚠️ Preencha todos os campos obrigatórios.');
    return;
  }

  try {
    // 1. Registrar usuário com perfil voluntário
    const regRes = await fetch(`${API_BASE}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, perfil: 'voluntario' }),
    });

    if (!regRes.ok) {
      const err = await regRes.json();
      showToast(`⚠️ ${err.erro || 'Erro ao registrar usuário.'}`);
      return;
    }

    const regData  = await regRes.json();
    const token    = regData.token;
    const usuarioId= regData.usuario?.id;

    if (!usuarioId) { showToast('⚠️ Erro: ID do usuário não retornado.'); return; }
    localStorage.setItem('token', token);

    // 2. Cadastrar como voluntário
    const volRes = await fetch(`${API_BASE}/voluntarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cpf, tipo_moradia: moradia }),
    });

    if (!volRes.ok) {
      const err = await volRes.json();
      showToast(`⚠️ ${err.erro || 'Erro ao registrar voluntário.'}`);
      return;
    }

    showToast('✅ Cadastro enviado! Aguarde a validação do administrador.');

    // Limpar formulário
    ['vol-nome','vol-email','vol-senha','vol-cpf'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const morEl = document.getElementById('vol-moradia');
    if (morEl) morEl.value = '';

  } catch (err) {
    console.error('Erro no cadastro de voluntário:', err);
    showToast('🔌 Erro de conexão. Verifique se a API está rodando.');
  }
}

// ══════════════════════════════════════════════════════════════
//  QUIZ DE COMPATIBILIDADE (integrado com /api/v1/match)
// ══════════════════════════════════════════════════════════════
let respostasQuiz = {};

function openQuiz() {
  document.getElementById('quizModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  resetQuiz();
}

function closeQuiz() {
  document.getElementById('quizModal').classList.remove('active');
  document.body.style.overflow = '';
}

function resetQuiz() {
  respostasQuiz = {};
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById('quizStep' + i);
    if (s) s.style.display = 'none';
  }
  const r = document.getElementById('quizResults');
  if (r) r.style.display = 'none';
  document.getElementById('quizStep1').style.display = 'block';
  document.getElementById('quizBar').style.width = '14%';
}

function nextStep(step) {
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById('quizStep' + i);
    if (s) s.style.display = 'none';
  }
  const el = document.getElementById('quizStep' + step);
  if (el) el.style.display = 'block';
  document.getElementById('quizBar').style.width = (step / 7 * 100) + '%';
}

function selectChoice(el) {
  el.closest('.quiz-grid').querySelectorAll('.quiz-choice').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  // Capturar a resposta pelo data-group e data-val do elemento
  const group = el.dataset.group;
  const val   = el.dataset.val;
  if (group && val !== undefined) respostasQuiz[group] = val;
}

// Mapeamento das perguntas/passos para os campos da API
const QUIZ_STEP_MAPS = {
  1: { group: 'tipo_moradia',         defaultVal: 'casa_com_quintal' },
  2: { group: 'possui_criancas',      defaultVal: '0'                },
  3: { group: 'preferencia_energia',  defaultVal: 'qualquer'         },
  4: { group: 'tempo_livre_diario_h', defaultVal: '4'                },
  5: { group: 'experiencia_previa',   defaultVal: 'intermediario'    },
};

function captureStepAnswer(step) {
  const map = QUIZ_STEP_MAPS[step];
  if (!map) return;
  const selected = document.querySelector(`#quizStep${step} .quiz-choice.selected`);
  if (selected) {
    respostasQuiz[map.group] = selected.dataset.val || selected.textContent.trim();
  } else if (!respostasQuiz[map.group]) {
    respostasQuiz[map.group] = map.defaultVal;
  }
}

function goNextStep(current, next) {
  captureStepAnswer(current);
  nextStep(next);
}

async function showResults() {
  captureStepAnswer(5);

  const resultsDiv = document.getElementById('quizResults');
  const listDiv    = document.getElementById('match-list');

  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById('quizStep' + i);
    if (s) s.style.display = 'none';
  }
  resultsDiv.style.display = 'block';
  document.getElementById('quizBar').style.width = '100%';

  if (listDiv) listDiv.innerHTML = '<div class="loading-state">🤖 Calculando compatibilidade...</div>';

  try {
    // Montar payload para a API de match
    const payload = {
      tipo_moradia:         respostasQuiz.tipo_moradia         || 'casa_com_quintal',
      experiencia_previa:   respostasQuiz.experiencia_previa   || 'intermediario',
      preferencia_especie:  respostasQuiz.preferencia_especie  || 'qualquer',
      preferencia_porte:    respostasQuiz.preferencia_porte    || 'qualquer',
      preferencia_energia:  respostasQuiz.preferencia_energia  || 'qualquer',
      possui_criancas:      parseInt(respostasQuiz.possui_criancas   || '0'),
      possui_outros_animais:parseInt(respostasQuiz.possui_outros_animais || '0'),
      tempo_livre_diario_h: parseInt(respostasQuiz.tempo_livre_diario_h  || '4'),
    };

    const token    = localStorage.getItem('token');
    const headers  = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/match`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const matches = data.matches || data.resultados || [];

    if (!matches.length) {
      listDiv.innerHTML = '<div class="empty-state">Nenhum match encontrado no momento. Tente outros critérios.</div>';
      return;
    }

    listDiv.innerHTML = matches.slice(0, 5).map(m => {
      const pct   = Math.round((m.compatibilidade || m.score || 0) * 100);
      const emoji = EMOJI_MAP[m.especie] || EMOJI_MAP.default;
      return `
        <div class="match-result-card"
             onclick="showToast('📅 Entrevista com ${m.nome} agendada! Aguarde confirmação por e-mail.')">
          <div class="match-emoji">${emoji}</div>
          <div class="match-info">
            <h4>${m.nome}</h4>
            <p>${m.especie || ''} · ${m.porte || ''} · ${m.nivel_energia || ''}</p>
          </div>
          <div class="match-pct-badge">${pct}%</div>
        </div>
      `;
    }).join('');

    // Atualizar barras de match no catálogo principal
    matches.forEach(m => {
      const pct = Math.round((m.compatibilidade || m.score || 0) * 100);
      const bar = document.getElementById(`match-bar-${m.id}`);
      const pctEl = document.getElementById(`match-pct-${m.id}`);
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    });

  } catch (err) {
    console.error('Erro ao calcular match:', err);
    listDiv.innerHTML = '<div class="empty-state">Erro ao calcular o match. Verifique a conexão com a API.</div>';
  }
}

// ══════════════════════════════════════════════════════════════
//  SELEÇÃO DO QUIZ MOCKUP (seção "Como funciona")
// ══════════════════════════════════════════════════════════════
function selectOpt(el) {
  document.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Fechar modal ao clicar fora ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('quizModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeQuiz();
    });
  }
});
