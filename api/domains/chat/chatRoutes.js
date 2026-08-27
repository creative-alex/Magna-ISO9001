const express = require('express');
const router = express.Router();
const { getConversas, getMensagens, marcarLida } = require('./chatController');
const { requireAuth, requireAdminOrHR } = require('../../shared/middleware/auth');

router.get('/conversas', requireAuth, requireAdminOrHR, getConversas);
router.get('/mensagens/:colaboradorId', requireAuth, getMensagens);
router.post('/marcar-lida/:colaboradorId', requireAuth, marcarLida);

module.exports = router;
