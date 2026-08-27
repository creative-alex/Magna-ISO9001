const express = require('express');
const router = express.Router();
const { getParametros, updateParametros } = require('../controllers/parametrosSalarioController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getParametros);
router.put('/', requireAuth, updateParametros);

module.exports = router;
