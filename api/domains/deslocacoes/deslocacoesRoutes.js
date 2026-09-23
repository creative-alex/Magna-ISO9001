const express = require("express");
const router = express.Router();
const { requireAuth, isAdminOrHR, isGestorFinanceiro } = require("../../shared/middleware/auth");
const {
  createDeslocacao,
  listDeslocacoes,
  getPendingDeslocacoes,
  approveDeslocacao,
  rejectDeslocacao,
  deleteDeslocacao,
  getUidsComDeslocacoesPendentes,
} = require("./deslocacoesController");

// Aprovação de deslocações: SuperAdmin/GestorRH/GestorFinanceiro - ao contrário do resto do
// processamento salarial (canAccess em salarioController.js, exclusivo de SuperAdmin/
// GestorFinanceiro), aqui GestorRH também aprova, já que a viagem em si é uma questão de
// RH mesmo que o valor entre no vencimento (mesmo padrão de requireAdminOrHRorFinanceiro
// em fechoMensalRoutes.js).
function requireAdminOrHRorFinanceiro(req, res, next) {
  if (!isAdminOrHR(req.user?.nivelAcesso) && !isGestorFinanceiro(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores, RH ou financeiro" });
  }
  next();
}

// A distinção self/admin-em-nome-de-outro já é feita por resolveTargetUid dentro do
// controller (mesma convenção de /timetracking/vacation).
router.post("/", requireAuth, createDeslocacao);
router.post("/list", requireAuth, listDeslocacoes);
router.delete("/", requireAuth, deleteDeslocacao);

// Revisão pela GestorRH/GestorFinanceiro (ou SuperAdmin) - feita em /salarios/:id (ver
// SalarioColaborador.jsx), junto ao resto do processamento salarial.
router.post("/pending", requireAuth, requireAdminOrHRorFinanceiro, getPendingDeslocacoes);
router.post("/approve", requireAuth, requireAdminOrHRorFinanceiro, approveDeslocacao);
router.post("/reject", requireAuth, requireAdminOrHRorFinanceiro, rejectDeslocacao);

// Aviso "Quilómetros por validar" na lista de /salarios - visibilidade mais larga
// (inclui GestorFinanceiro) do que a aprovação em si; a permissão exata é validada
// dentro do controller.
router.post("/pending-uids", requireAuth, getUidsComDeslocacoesPendentes);

module.exports = router;
