const express = require('express');
const router = express.Router();
const { getCadastro, saveCadastro } = require('./cadastroController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id', requireAuth, getCadastro);
router.put('/:id', requireAuth, saveCadastro);

module.exports = router;
