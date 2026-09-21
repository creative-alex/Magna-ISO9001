const express = require('express');
const router = express.Router();
const { getCadastro, saveCadastro, notifyPerfilIncompleto, notifyEntidadeSemNif } = require('./cadastroController');
const { requireAuth } = require('../../shared/middleware/auth');

router.post('/notify-sem-nif', requireAuth, notifyEntidadeSemNif);
router.get('/:id', requireAuth, getCadastro);
router.put('/:id', requireAuth, saveCadastro);
router.post('/:id/notify-incomplete', requireAuth, notifyPerfilIncompleto);

module.exports = router;
