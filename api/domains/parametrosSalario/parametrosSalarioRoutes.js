const express = require('express');
const router = express.Router();
const { getParametros, updateParametros } = require('./parametrosSalarioController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/', requireAuth, getParametros);
router.put('/', requireAuth, updateParametros);

module.exports = router;
