const express = require('express');
const router = express.Router();
const animalCtrl = require('../controllers/animalController');
const { autenticar, autorizar } = require('../middlewares/auth');

// Note que aqui as funções devem ter os nomes EXATOS do seu animalController.js
router.get('/catalogo', animalCtrl.catalogo); // Verifique se é 'catalogo' ou 'listarCatalogo'
router.get('/microchip/:codigo', animalCtrl.buscarPorMicrochip);

// Admin / Veterinário 
router.get('/', autenticar, autorizar('admin','veterinario'), animalCtrl.listar);
router.post('/', autenticar, autorizar('admin','veterinario'), animalCtrl.criar);
router.get('/:id', animalCtrl.buscarPorId);
router.put('/:id', autenticar, autorizar('admin','veterinario'), animalCtrl.atualizar); // No controller o nome é 'atualizar'
router.delete('/:id', autenticar, autorizar('admin','veterinario'), animalCtrl.remover);

module.exports = router;