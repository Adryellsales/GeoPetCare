const db = require('../config/database');

// ── POST /doacoes ─────────────────────────────────────────────
// RF05: Módulo de Doações
const criar = async (req, res) => {
  const { valor, metodo, recorrente = false } = req.body;

  if (!valor || !metodo) {
    return res.status(400).json({ erro: 'valor e metodo são obrigatórios.' });
  }
  if (!['pix','cartao','boleto'].includes(metodo)) {
    return res.status(400).json({ erro: "metodo deve ser: pix, cartao ou boleto." });
  }
  if (parseFloat(valor) <= 0) {
    return res.status(400).json({ erro: 'Valor deve ser maior que zero.' });
  }

  try {
    // Simulação de gateway (RNF05: sem dados de cartão no BD)
    const gatewayId = `GW-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const recibo    = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const [result] = await db.query(
      `INSERT INTO doacoes (usuario_id, valor, metodo, recorrente, status, gateway_id, recibo_numero)
       VALUES (?, ?, ?, ?, 'pendente', ?, ?)`,
      [req.usuario?.id || null, valor, metodo, recorrente ? 1 : 0, gatewayId, recibo]
    );

    // Simula confirmação imediata para Pix
    // (em produção: webhook do gateway confirmaria)
    let resposta = {
      mensagem: 'Doação registrada. Aguardando confirmação do pagamento.',
      doacao_id: result.insertId,
      recibo,
      gateway_id: gatewayId,
    };

    if (metodo === 'pix') {
      // UC04: Fluxo principal Pix
      resposta.pix_copia_cola = `00020126580014BR.GOV.BCB.PIX0136geo-petcare-${gatewayId}@pix5204000053039865802BR5915GEO Pet Care6009Guarulhos62070503***6304${recibo.slice(-4)}`;
      resposta.instrucao = 'Use o código Pix acima para finalizar a doação.';
    } else if (metodo === 'cartao') {
      // UC04: Fluxo de Exceção — cartão recusado simularia retorno de status 'falhou'
      resposta.instrucao = 'Pagamento em processamento pelo gateway.';
      resposta.fallback_pix = 'Em caso de falha no cartão, use o endpoint POST /doacoes/:id/pix-fallback';
    } else {
      resposta.instrucao = 'Boleto gerado. Vencimento em 3 dias úteis.';
    }

    return res.status(201).json(resposta);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /doacoes ─────────────────────────────────────────────
const listar = async (req, res) => {
  const { status } = req.query;
  const filtros = [];
  const params = [];

  if (status) {
    filtros.push('d.status = ?');
    params.push(status);
  }

  try {
    const [rows] = await db.query(
      `SELECT d.*, u.nome AS usuario_nome, u.email AS usuario_email
       FROM doacoes d
       LEFT JOIN usuarios u ON u.id = d.usuario_id
       ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
       ORDER BY d.criado_em DESC`,
      params
    );
    return res.json({ dados: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── POST /doacoes/:id/confirmar ───────────────────────────────
// Webhook do gateway confirma pagamento e atualiza dashboard
const confirmar = async (req, res) => {
  try {
    await db.query(
      "UPDATE doacoes SET status = 'confirmado', confirmado_em = NOW() WHERE id = ?",
      [req.params.id]
    );
    return res.json({ mensagem: 'Doação confirmada. Dashboard de transparência atualizado.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── POST /doacoes/:id/pix-fallback ────────────────────────────
// UC04: Fallback Pix quando cartão é recusado
const pixFallback = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doacoes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Doação não encontrada.' });

    await db.query("UPDATE doacoes SET metodo = 'pix', status = 'pendente' WHERE id = ?", [req.params.id]);

    return res.json({
      mensagem: 'Pagamento redirecionado para Pix.',
      pix_copia_cola: `00020126580014BR.GOV.BCB.PIX0136geo-petcare@fallback.pix5204000053039865802BR5915GEO Pet Care6009Guarulhos62070503***6304FALL`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /doacoes/dashboard ────────────────────────────────────
// RF04: Portal da Transparência (público)
const dashboard = async (req, res) => {
  try {
    // Pegamos a primeira linha (e única) da View
    const [[stats]] = await db.query('SELECT * FROM vw_dashboard_transparencia');
    
    // Se não houver dados, enviamos um objeto vazio
    if (!stats) return res.json({});

    // Enviamos o objeto direto, sem a chave "dados: stats"
    return res.json(stats); 
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { criar, listar, confirmar, pixFallback, dashboard };
