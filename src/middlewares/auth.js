const jwt = require('jsonwebtoken');

// ── Verifica token JWT ──────────────────────────────────────
const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, nome, email, perfil }
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
};

// ── Restringe por perfil ────────────────────────────────────
const autorizar = (...perfisPermitidos) => (req, res, next) => {
  if (!perfisPermitidos.includes(req.usuario.perfil)) {
    return res.status(403).json({
      erro: `Acesso negado. Requer perfil: ${perfisPermitidos.join(' ou ')}.`
    });
  }
  next();
};

module.exports = { autenticar, autorizar };
