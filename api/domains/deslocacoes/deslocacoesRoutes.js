const express = require("express");
const router = express.Router();
const { requireAuth, requireAdminOrHR } = require("../../shared/middleware/auth");
const {
  createDeslocacao,
  listDeslocacoes,
  getPendingDeslocacoes,
  approveDeslocacao,
  rejectDeslocacao,
  deleteDeslocacao,
  getUidsComDeslocacoesPendentes,
} = require("./deslocacoesController");

// A distinção self/admin-em-nome-de-outro já é feita por resolveTargetUid dentro do
// controller (mesma convenção de /timetracking/vacation).
router.post("/", requireAuth, createDeslocacao);
router.post("/list", requireAuth, listDeslocacoes);
router.delete("/", requireAuth, deleteDeslocacao);

// Revisão pela GestorRH (SuperAdmin/GestorRH) - feita em /salarios/:id (ver
// SalarioColaborador.jsx), junto ao resto do processamento salarial.
router.post("/pending", requireAuth, requireAdminOrHR, getPendingDeslocacoes);
router.post("/approve", requireAuth, requireAdminOrHR, approveDeslocacao);
router.post("/reject", requireAuth, requireAdminOrHR, rejectDeslocacao);

// Aviso "Quilómetros por validar" na lista de /salarios - visibilidade mais larga
// (inclui GestorFinanceiro) do que a aprovação em si; a permissão exata é validada
// dentro do controller.
router.post("/pending-uids", requireAuth, getUidsComDeslocacoesPendentes);

module.exports = router;
