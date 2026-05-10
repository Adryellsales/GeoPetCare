const db = require('../config/database');

// ══════════════════════════════════════════════════════════════
//  ALGORITMO DE MATCH — GEO Pet Care (RF06 + RF07)
//  Cruza perfil do adotante com características do animal.
//  Score de 0 a 100, retorna apenas animais com score >= 30.
//  (RN01 já filtrado via vw_catalogo_publico)
// ══════════════════════════════════════════════════════════════

const PESOS = {
  especie:        25,
  porte:          20,
  energia:        20,
  criancas:       15,
  experiencia:    10,
  outros_animais: 10,
};

const calcularScore = (adotante, animal) => {
  let score = 0;
  const detalhes = {};

  // 1. Espécie (25pts)
  if (adotante.preferencia_especie === 'qualquer' || adotante.preferencia_especie === animal.especie) {
    score += PESOS.especie;
    detalhes.especie = { pontos: PESOS.especie, ok: true };
  } else {
    detalhes.especie = { pontos: 0, ok: false };
  }

  // 2. Porte (20pts) — match exato = 20, adjacente = 10
  if (adotante.preferencia_porte === 'qualquer' || adotante.preferencia_porte === animal.porte) {
    score += PESOS.porte;
    detalhes.porte = { pontos: PESOS.porte, ok: true };
  } else {
    const ordemPorte = ['pequeno','medio','grande'];
    const diffPorte = Math.abs(
      ordemPorte.indexOf(adotante.preferencia_porte) - ordemPorte.indexOf(animal.porte)
    );
    const pts = diffPorte === 1 ? Math.round(PESOS.porte / 2) : 0;
    score += pts;
    detalhes.porte = { pontos: pts, ok: false, motivo: 'Porte diferente do preferido' };
  }

  // 3. Nível de energia (20pts)
  if (adotante.preferencia_energia === 'qualquer' || adotante.preferencia_energia === animal.nivel_energia) {
    score += PESOS.energia;
    detalhes.energia = { pontos: PESOS.energia, ok: true };
  } else {
    const ordemEnergia = ['baixo','moderado','alto'];
    const diffEnergia = Math.abs(
      ordemEnergia.indexOf(adotante.preferencia_energia) - ordemEnergia.indexOf(animal.nivel_energia)
    );
    const pts = diffEnergia === 1 ? Math.round(PESOS.energia / 2) : 0;
    score += pts;
    detalhes.energia = { pontos: pts, ok: false, motivo: 'Energia diferente da preferida' };
  }

  // 4. Crianças em casa (15pts) — bloqueante se animal não for compatível
  if (adotante.possui_criancas && !animal.compativel_criancas) {
    detalhes.criancas = { pontos: 0, ok: false, motivo: 'Animal não indicado para crianças' };
  } else {
    score += PESOS.criancas;
    detalhes.criancas = { pontos: PESOS.criancas, ok: true };
  }

  // 5. Experiência do adotante (10pts)
  const ordemExp = ['iniciante','intermediario','avancado'];
  const nivelExp = ordemExp.indexOf(adotante.experiencia_previa);
  // Animais com necessidades especiais exigem nível intermediário+
  if (animal.necessidades_especiais && nivelExp < 1) {
    detalhes.experiencia = { pontos: 0, ok: false, motivo: 'Animal com necessidades especiais exige experiência' };
  } else {
    score += PESOS.experiencia;
    detalhes.experiencia = { pontos: PESOS.experiencia, ok: true };
  }

  // 6. Outros animais em casa (10pts)
  if (adotante.possui_outros_animais && !animal.compativel_outros_animais) {
    detalhes.outros_animais = { pontos: 0, ok: false, motivo: 'Animal não é compatível com outros pets' };
  } else {
    score += PESOS.outros_animais;
    detalhes.outros_animais = { pontos: PESOS.outros_animais, ok: true };
  }

  return { score: Math.min(score, 100), detalhes };
};

// ── POST /match ───────────────────────────────────────────────
const calcularMatch = async (req, res) => {
  const {
    tipo_moradia, possui_criancas, possui_outros_animais,
    tempo_livre_diario_h, experiencia_previa,
    preferencia_especie = 'qualquer',
    preferencia_porte   = 'qualquer',
    preferencia_energia = 'qualquer',
  } = req.body;

  if (!tipo_moradia || !experiencia_previa) {
    return res.status(400).json({ erro: 'tipo_moradia e experiencia_previa são obrigatórios.' });
  }

  const adotanteQuiz = {
    tipo_moradia,
    possui_criancas:       !!possui_criancas,
    possui_outros_animais: !!possui_outros_animais,
    tempo_livre_diario_h:  parseInt(tempo_livre_diario_h || 4),
    experiencia_previa,
    preferencia_especie,
    preferencia_porte,
    preferencia_energia,
  };

  try {
    // Busca apenas animais disponíveis e não bloqueados (RN01 via view)
    const [animais] = await db.query(
      `SELECT * FROM vw_catalogo_publico`
    );

    if (!animais.length) {
      return res.json({
        mensagem: 'Nenhum animal disponível no momento.',
        matches: [],
      });
    }

    // Calcula score para cada animal
    const resultados = animais
      .map(animal => {
        const { score, detalhes } = calcularScore(adotanteQuiz, animal);
        return { animal, score, detalhes };
      })
      .filter(r => r.score >= 30) // UC03: não exibe matches abaixo de 30%
      .sort((a, b) => b.score - a.score);

    // UC03: sem matches -> orienta cadastro de e-mail
    if (!resultados.length) {
      return res.json({
        mensagem: 'Nenhum animal compatível encontrado no momento.',
        sugestao: 'Cadastre seu e-mail para ser notificado quando novos animais chegarem.',
        matches: [],
      });
    }

    // Salva matches no BD se usuário estiver autenticado
    if (req.usuario) {
      const [adotanteRows] = await db.query(
        'SELECT id FROM adotantes WHERE usuario_id = ?', [req.usuario.id]
      );
      if (adotanteRows.length) {
        const adotanteId = adotanteRows[0].id;
        for (const r of resultados) {
          await db.query(
            `INSERT INTO matches_adocao (adotante_id, animal_id, score, detalhes_json)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE score = VALUES(score), detalhes_json = VALUES(detalhes_json)`,
            [adotanteId, r.animal.id, r.score, JSON.stringify(r.detalhes)]
          );
        }
      }
    }

    return res.json({
      total: resultados.length,
      matches: resultados.map(r => ({
        score:    parseFloat(r.score.toFixed(2)),
        animal:   r.animal,
        detalhes: r.detalhes,
      })),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { calcularMatch };
