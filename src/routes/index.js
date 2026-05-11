const express  = require('express');
const router   = express.Router();

const { autenticar, autorizar } = require('../middlewares/auth');

const authCtrl       = require('../controllers/authController');
const voluntarioCtrl = require('../controllers/voluntarioController');
const doacaoCtrl     = require('../controllers/doacaoController');
const adotanteCtrl   = require('../controllers/adotanteController');
const matchCtrl      = require('../controllers/matchController');
const { calcularMatch } = require('../services/matchService');

// Importando o novo roteador de animais
const animalRoutes = require('./animalRoutes'); 

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
router.post('/auth/registro', authCtrl.registro);
router.post('/auth/login',    authCtrl.login);
router.get( '/auth/me',       autenticar, authCtrl.me);

// ══════════════════════════════════════════════════════════════
//  ANIMAIS (Usando o arquivo separado)
// ══════════════════════════════════════════════════════════════
// IMPORTANTE: Aqui o animalRoutes cuidará de tudo que começa com /animais
router.use('/animais', animalRoutes);

// ─────────────────────────────────────────────────────────────────────
//  DOAÇÕES
// ─────────────────────────────────────────────────────────────────────
router.post('/doacoes', doacaoCtrl.criar);
router.get('/doacoes', autenticar, autorizar('admin'), doacaoCtrl.listar);
router.post('/doacoes/:id/confirmar', autenticar, autorizar('admin'), doacaoCtrl.confirmar);
router.post('/doacoes/:id/pix-fallback', doacaoCtrl.pixFallback);
router.get('/doacoes/dashboard', doacaoCtrl.dashboard);

// ─────────────────────────────────────────────────────────────────────
//  ADOTANTES
router.get('/adotantes', autenticar, autorizar('admin'), adotanteCtrl.listar);

// ─────────────────────────────────────────────────────────────────────
//  MATCHES
router.get('/matches', autenticar, autorizar('admin'), matchCtrl.listar);

// ─────────────────────────────────────────────────────────────────────
//  VOLUNTÁRIOS
// ─────────────────────────────────────────────────────────────────────
router.post('/voluntarios', autenticar, voluntarioCtrl.cadastrar);
router.get('/voluntarios', autenticar, autorizar('admin'), voluntarioCtrl.listar);
router.put('/voluntarios/:id/validar', autenticar, autorizar('admin'), voluntarioCtrl.validar);
router.put('/voluntarios/:id', autenticar, autorizar('admin'), voluntarioCtrl.atualizar);
router.delete('/voluntarios/:id', autenticar, autorizar('admin'), voluntarioCtrl.remover);

// ══════════════════════════════════════════════════════════════════════
//  MATCH (IA)
// ══════════════════════════════════════════════════════════════════════
router.post('/match', (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth) {
    autenticar(req, res, next);
  } else {
    next();
  }
}, calcularMatch);

module.exports = router;