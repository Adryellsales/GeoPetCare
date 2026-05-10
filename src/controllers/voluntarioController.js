const db = require('../config/database');

// ── POST /voluntarios ─────────────────────────────────────────
// RF02: Cadastro de voluntário
const cadastrar = async (req, res) => {
  const { cpf, tipo_moradia, doc_rg_url, doc_comprovante_url, doc_antecedentes_url } = req.body;

  if (!cpf || !tipo_moradia) {
    return res.status(400).json({ erro: 'cpf e tipo_moradia são obrigatórios.' });
  }

  try {
    const [existe] = await db.query(
      'SELECT id FROM voluntarios WHERE cpf = ?', [cpf]
    );
    if (existe.length) {
      // UC02 - Fluxo de Exceção: bloqueia CPF com irregularidades
      const [reprovado] = await db.query(
        "SELECT id FROM voluntarios WHERE cpf = ? AND status_validacao = 'reprovado'", [cpf]
      );
      if (reprovado.length) {
        return res.status(403).json({ erro: 'CPF bloqueado permanentemente na plataforma.' });
      }
      return res.status(409).json({ erro: 'CPF já cadastrado.' });
    }

    // Se um Admin estiver criando, ele pode passar o usuario_id no body, caso contrário assume o do logado
    const uid = (req.usuario.perfil === 'admin' && req.body.usuario_id) ? req.body.usuario_id : req.usuario.id;

    const [result] = await db.query(
      `INSERT INTO voluntarios (usuario_id, cpf, tipo_moradia, doc_rg_url, doc_comprovante_url, doc_antecedentes_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uid, cpf, tipo_moradia, doc_rg_url || null, doc_comprovante_url || null, doc_antecedentes_url || null]
    );

    return res.status(201).json({
      mensagem: 'Cadastro enviado. Aguarde a validação do administrador.',
      voluntario_id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /voluntarios ──────────────────────────────────────────
// Admin: lista todos
const listar = async (req, res) => {
  const { status } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT v.*, u.nome, u.email FROM voluntarios v
       JOIN usuarios u ON u.id = v.usuario_id
       ${status ? 'WHERE v.status_validacao = ?' : ''}
       ORDER BY v.criado_em DESC`,
      status ? [status] : []
    );
    return res.json({ dados: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── PUT /voluntarios/:id/validar ──────────────────────────────
// UC02: Administrador aprova ou reprova voluntário
const validar = async (req, res) => {
  const { acao, check_rg_ok, check_comprovante_ok, check_antecedentes_ok, check_investigacao_ok, motivo_reprovacao } = req.body;

  if (!['aprovar','reprovar','aguardando_correcao'].includes(acao)) {
    return res.status(400).json({ erro: "acao deve ser: aprovar, reprovar ou aguardando_correcao." });
  }

  const statusMap = { aprovar: 'aprovado', reprovar: 'reprovado', aguardando_correcao: 'aguardando_correcao' };

  try {
    await db.query(
      `UPDATE voluntarios SET
        status_validacao   = ?,
        check_rg_ok           = ?,
        check_comprovante_ok  = ?,
        check_antecedentes_ok = ?,
        check_investigacao_ok = ?,
        motivo_reprovacao  = ?,
        validado_por       = ?
       WHERE id = ?`,
      [
        statusMap[acao],
        check_rg_ok ? 1 : 0,
        check_comprovante_ok ? 1 : 0,
        check_antecedentes_ok ? 1 : 0,
        check_investigacao_ok ? 1 : 0,
        motivo_reprovacao || null,
        req.usuario.id,
        req.params.id,
      ]
    );

    return res.json({ mensagem: `Voluntário ${statusMap[acao]} com sucesso.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── PUT /voluntarios/:id ──────────────────────────────
const atualizar = async (req, res) => {
  const { cpf, tipo_moradia } = req.body;
  
  if (!cpf || !tipo_moradia) {
    return res.status(400).json({ erro: 'cpf e tipo_moradia são obrigatórios.' });
  }
  
  try {
    await db.query(
      'UPDATE voluntarios SET cpf = ?, tipo_moradia = ? WHERE id = ?',
      [cpf, tipo_moradia, req.params.id]
    );
    return res.json({ mensagem: 'Voluntário atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── DELETE /voluntarios/:id ──────────────────────────
const remover = async (req, res) => {
  try {
    await db.query('DELETE FROM voluntarios WHERE id = ?', [req.params.id]);
    return res.json({ mensagem: 'Voluntário removido com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { cadastrar, listar, validar, atualizar, remover };
