const express = require('express');
const router = express.Router();
const { getCadastro, saveCadastro } = require('../controllers/cadastroController');
const { requireAuth } = require('../middleware/auth');

router.get('/:id', requireAuth, getCadastro);
router.put('/:id', requireAuth, saveCadastro);

module.exports = router;
