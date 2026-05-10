const db = require('../config/database');

// ── Gera código sequencial GEO-XXX ────────────────────────────
const gerarCodigo = async () => {
  const [rows] = await db.query('SELECT COUNT(*) AS total FROM animais');
  const num = rows[0].total + 1;
  return `GEO-${String(num).padStart(3, '0')}`;
};

// ── POST /animais ─────────────────────────────────────────────
// RF01: Cadastro e Triagem Médica (Essencial)
const criar = async (req, res) => {
  const {
    microchip, nome, especie, raca, idade_estimada, data_resgate,
    classificacao_risco, laudo_observacoes,
    nivel_energia, porte,
    castrado, vacinado, necessidades_especiais,
    compativel_criancas, compativel_outros_animais,
  } = req.body;

  // Campos obrigatórios da triagem (UC01 - Fluxo de Exceção)
  if (!nome || !especie || !porte || !classificacao_risco || !data_resgate) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: nome, especie, porte, classificacao_risco, data_resgate.',
      campos_faltando: ['nome','especie','porte','classificacao_risco','data_resgate']
        .filter(c => !req.body[c])
    });
  }

  const riscosValidos = ['critico','grave','medio','baixo'];
  if (!riscosValidos.includes(classificacao_risco)) {
    return res.status(400).json({ erro: `classificacao_risco deve ser: ${riscosValidos.join(', ')}.` });
  }

  try {
    // RN02: Alerta de capacidade
    const [cap] = await db.query(
      "SELECT COUNT(*) AS total FROM animais WHERE status_adocao != 'adotado'"
    );
    const alertaCapacidade = cap[0].total >= 28; // alerta ao aproximar de 30

    const codigo = await gerarCodigo();

    const [result] = await db.query(
      `INSERT INTO animais
        (codigo, microchip, nome, especie, raca, idade_estimada, data_resgate,
         classificacao_risco, laudo_observacoes, nivel_energia, porte,
         castrado, vacinado, necessidades_especiais,
         compativel_criancas, compativel_outros_animais, cadastrado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        codigo, microchip || null, nome, especie, raca || 'SRD',
        idade_estimada || null, data_resgate,
        classificacao_risco, laudo_observacoes || null,
        nivel_energia || 'moderado', porte,
        castrado ? 1 : 0, vacinado ? 1 : 0,
        necessidades_especiais ? 1 : 0,
        compativel_criancas !== false ? 1 : 0,
        compativel_outros_animais !== false ? 1 : 0,
        req.usuario?.id || 1
      ]
    );

    // RN01: informa se o animal está bloqueado do catálogo público
    const bloqueadoCatalogo = ['critico','grave'].includes(classificacao_risco);

    return res.status(201).json({
      mensagem: 'Animal cadastrado com sucesso.',
      animal: { id: result.insertId, codigo },
      avisos: [
        bloqueadoCatalogo ? '⚠️  RN01: Animal bloqueado do catálogo público (risco crítico/grave).' : null,
        alertaCapacidade   ? '⚠️  RN02: Sede próxima da capacidade máxima (30). Acione lares temporários.' : null,
      ].filter(Boolean),
    });

  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Microchip já cadastrado no sistema.' });
    }
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /animais ───────────────────────────────────────────────
const listar = async (req, res) => {
  const { status, risco, especie, porte, pagina = 1, limite = 20 } = req.query;
  const offset = (parseInt(pagina) - 1) * parseInt(limite);

  let where = ['1=1'];
  const params = [];

  if (status)  { where.push('a.status_adocao = ?');        params.push(status); }
  if (risco)   { where.push('a.classificacao_risco = ?');  params.push(risco); }
  if (especie) { where.push('a.especie = ?');               params.push(especie); }
  if (porte)   { where.push('a.porte = ?');                 params.push(porte); }

  try {
    const [animais] = await db.query(
      `SELECT a.*,
              DATEDIFF(CURDATE(), a.data_resgate) AS dias_sede,
              CASE WHEN DATEDIFF(CURDATE(), a.data_resgate) >= 90 THEN 1 ELSE 0 END AS invisivel,
              u.nome AS cadastrado_por_nome
       FROM animais a
       LEFT JOIN usuarios u ON u.id = a.cadastrado_por
       WHERE ${where.join(' AND ')}
       ORDER BY a.criado_em DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM animais a WHERE ${where.join(' AND ')}`,
      params
    );

    return res.json({
      dados: animais,
      paginacao: { pagina: parseInt(pagina), limite: parseInt(limite), total, paginas: Math.ceil(total / limite) }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /animais/catalogo ──────────────────────────────────────
// Catálogo PÚBLICO — aplica RN01 via VIEW do banco
const catalogo = async (req, res) => {
  const { especie, porte, energia } = req.query;
  let where = ['1=1'];
  const params = [];

  if (especie) { where.push('especie = ?'); params.push(especie); }
  if (porte)   { where.push('porte = ?');   params.push(porte); }
  if (energia) { where.push('nivel_energia = ?'); params.push(energia); }

  try {
    const [rows] = await db.query(
      `SELECT * FROM vw_catalogo_publico WHERE ${where.join(' AND ')} ORDER BY invisivel DESC, dias_sede DESC`,
      params
    );
    return res.json({ dados: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /animais/:id ───────────────────────────────────────────
const buscarPorId = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*,
              DATEDIFF(CURDATE(), a.data_resgate) AS dias_sede,
              CASE WHEN DATEDIFF(CURDATE(), a.data_resgate) >= 90 THEN 1 ELSE 0 END AS invisivel
       FROM animais a WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Animal não encontrado.' });

    const [fotos] = await db.query('SELECT * FROM animal_fotos WHERE animal_id = ?', [req.params.id]);
    return res.json({ ...rows[0], fotos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /animais/microchip/:codigo ─────────────────────────────
// UC01: Fluxo alternativo - autopreenchimento por microchip
const buscarPorMicrochip = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM animais WHERE microchip = ?', [req.params.codigo]);
    if (!rows.length) return res.status(404).json({ erro: 'Microchip não encontrado no sistema.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── PUT /animais/:id ───────────────────────────────────────────
const atualizar = async (req, res) => {
  const campos = [
    'nome','especie','raca','idade_estimada','data_resgate',
    'classificacao_risco','laudo_observacoes','nivel_energia','porte',
    'castrado','vacinado','necessidades_especiais',
    'compativel_criancas','compativel_outros_animais','status_adocao'
  ];

  const atualizacoes = {};
  campos.forEach(c => { if (req.body[c] !== undefined) atualizacoes[c] = req.body[c]; });

  if (!Object.keys(atualizacoes).length) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
  }

  try {
    const sets = Object.keys(atualizacoes).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(atualizacoes), req.params.id];
    await db.query(`UPDATE animais SET ${sets} WHERE id = ?`, values);

    const bloqueado = ['critico','grave'].includes(atualizacoes.classificacao_risco);
    return res.json({
      mensagem: 'Animal atualizado com sucesso.',
      avisos: bloqueado ? ['⚠️  RN01: Risco alterado para crítico/grave — animal bloqueado do catálogo público.'] : [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── DELETE /animais/:id ────────────────────────────────────────
const remover = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nome FROM animais WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Animal não encontrado.' });
    await db.query('DELETE FROM animais WHERE id = ?', [req.params.id]);
    return res.json({ mensagem: `Animal "${rows[0].nome}" removido com sucesso.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { 
  criar, 
  listar, 
  catalogo,        // <--- Veja se esse nome bate com a linha 9 do routes
  buscarPorId, 
  buscarPorMicrochip, 
  atualizar, 
  remover 
};
