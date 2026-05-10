const db = require('../config/database');

const listar = async (req, res) => {
  const { preferencia_especie, preferencia_porte, experiencia_previa } = req.query;
  const filtros = [];
  const params = [];

  if (preferencia_especie) {
    filtros.push('a.preferencia_especie = ?');
    params.push(preferencia_especie);
  }
  if (preferencia_porte) {
    filtros.push('a.preferencia_porte = ?');
    params.push(preferencia_porte);
  }
  if (experiencia_previa) {
    filtros.push('a.experiencia_previa = ?');
    params.push(experiencia_previa);
  }

  try {
    const [rows] = await db.query(
      `SELECT a.*, u.nome AS usuario_nome, u.email AS usuario_email
       FROM adotantes a
       JOIN usuarios u ON u.id = a.usuario_id
       ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
       ORDER BY a.criado_em DESC`,
      params
    );

    return res.json({ dados: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { listar };