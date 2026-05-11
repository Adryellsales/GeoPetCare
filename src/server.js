require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globais ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Log de requisições (simples) ─────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
app.use('/frontend', express.static('frontend'));

// ── Prefixo /api/v1 ──────────────────────────────────────────
app.use('/api/v1', routes);

// ── Rota de health check ─────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sistema: 'GEO Pet Care API', versao: '1.0.0' });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// ── Error handler global ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n🐾  GEO Pet Care API rodando em http://localhost:${PORT}`);
  console.log(`📋  Health check: http://localhost:${PORT}/health`);
  console.log(`🔗  Base URL:     http://localhost:${PORT}/api/v1\n`);
});
