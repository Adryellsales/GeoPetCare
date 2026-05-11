const db = require('../config/database');

const listar = async (req, res) => {
  const { status } = req.query;
  const filtros = ['1=1'];
  const params = [];

  if (status) {
    filtros.push('m.status = ?');
    params.push(status);
  }

  try {
    const [rows] = await db.query(
      `SELECT m.id,
              m.score,
              m.status,
              m.detalhes_json,
              m.criado_em,
              a.nome AS animal_nome,
              a.codigo AS animal_codigo,
              a.especie AS animal_especie,
              u.nome AS adotante_nome,
              u.email AS adotante_email
       FROM matches_adocao m
       JOIN adotantes ad ON ad.id = m.adotante_id
       JOIN usuarios u ON u.id = ad.usuario_id
       JOIN animais a ON a.id = m.animal_id
       WHERE ${filtros.join(' AND ')}
       ORDER BY m.criado_em DESC`,
      params
    );

    return res.json({ dados: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { listar };