const express = require('express');
const router = express.Router();
const { getCadastro, saveCadastro, notifyPerfilIncompleto } = require('./cadastroController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id', requireAuth, getCadastro);
router.put('/:id', requireAuth, saveCadastro);
router.post('/:id/notify-incomplete', requireAuth, notifyPerfilIncompleto);

module.exports = router;
