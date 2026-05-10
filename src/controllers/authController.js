const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/database');

// ── POST /auth/registro ────────────────────────────────────────
const registro = async (req, res) => {
  const { nome, email, senha, perfil = 'adotante' } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'nome, email e senha são obrigatórios.' });
  }

  const perfisPermitidos = ['adotante', 'doador', 'voluntario'];
  if (!perfisPermitidos.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido para auto-registro.' });
  }

  try {
    const [existente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existente.length) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome, email, hash, perfil]
    );

    const token = gerarToken({ id: result.insertId, nome, email, perfil });
    return res.status(201).json({ mensagem: 'Usuário criado com sucesso.', token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── POST /auth/login ───────────────────────────────────────────
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'email e senha são obrigatórios.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, nome, email, senha_hash, perfil, ativo FROM usuarios WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = rows[0];

    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Conta desativada. Contate o administrador.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    const token = gerarToken(payload);

    return res.json({ mensagem: 'Login realizado com sucesso.', token, usuario: payload });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// ── GET /auth/me ───────────────────────────────────────────────
const me = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, nome, email, perfil, criado_em FROM usuarios WHERE id = ?',
    [req.usuario.id]
  );
  if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(rows[0]);
};

// ── Helper ─────────────────────────────────────────────────────
const gerarToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

module.exports = { registro, login, me };
