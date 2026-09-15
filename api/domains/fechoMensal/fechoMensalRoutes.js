const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, isAdminOrHRorAdministrador, isGestorFinanceiro } = require('../../shared/middleware/auth');
const {
  getFechoMensal,
  confirmFechoMensal,
  listFechoMensalStatus,
  triggerReminders,
  triggerSecondReminders,
  triggerSweep,
  sendReminderToUser,
} = require('./fechoMensalController');

// Visto também em /salarios (ver ExportFechoMensalButton/ProcessamentoSalarios.jsx) - o
// Gestor Financeiro precisa de ver quem já fechou o mês e de poder reenviar o lembrete
// antes de processar vencimentos, por isso junta-se aqui a requireAdminOrEntidadeAdmin.
function requireAdminOrEntidadeAdminOrFinanceiro(req, res, next) {
  if (!isAdminOrHRorAdministrador(req.user?.nivelAcesso) && !isGestorFinanceiro(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores, RH ou financeiro" });
  }
  next();
}

router.post('/status', requireAuth, getFechoMensal);
router.post('/confirm', requireAuth, confirmFechoMensal);
router.post('/all-status', requireAuth, requireAdminOrEntidadeAdminOrFinanceiro, listFechoMensalStatus);
router.post('/send-reminder', requireAuth, requireAdminOrEntidadeAdminOrFinanceiro, sendReminderToUser);

// Disparo manual/QA - só SuperAdmin (mesmo nível de acesso que outras ações sensíveis de
// livro de ponto, ver requireAdmin em timeTrackingRoutes.js).
router.post('/trigger-reminders', requireAuth, requireAdmin, triggerReminders);
router.post('/trigger-second-reminders', requireAuth, requireAdmin, triggerSecondReminders);
router.post('/trigger-sweep', requireAuth, requireAdmin, triggerSweep);

module.exports = router;
