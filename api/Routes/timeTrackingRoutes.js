const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, requireAdminOrHR } = require('../middleware/auth');
const {
  createUser,
  userDetails,
  getUsersByEntity,
  updateUserDetails,
  deleteUser,
} = require('../controllers/timeTracking/userManagementController');
const {
  registerEntry,
  checkEntry,
  registerLeave,
  checkLeave,
  checkTimeTracking,
  updateUserTime,
  deleteRegister,
  registerManualOvertime,
  getManualOvertimeForMonth,
  updateManualOvertime,
  deleteManualOvertime,
  debugCorruptOvertime,
  deleteCorruptOvertime,
} = require('../controllers/timeTracking/timeTrackingController');
const {
  createVacation,
  approveVacation,
  rejectVacation,
  createMedicalLeave,
  getPendingVacations,
  getAllUsersVacations,
} = require('../controllers/timeTracking/vacationController');
const {
  getUserRecords,
  getOvertimeSummary,
  getYearlySummary,
  processOvertimeDeduction,
  clearOvertimeDeductions,
} = require('../controllers/timeTracking/reportsController');
const { ping } = require('../controllers/timeTracking/utilsController');
const {
  getVacationMap,
  toggleVacationDay,
  setVacationQuotaOverride,
  setVacationCarryover,
} = require('../controllers/timeTracking/vacationMapController');

// Auto-serviço (qualquer utilizador autenticado, sobre os seus próprios dados)
//
// NOTA: não há rotas próprias de verificação de token / primeiro login aqui —
// a app fundida usa só as do Magna (/users/verifyTokenAndGetUserInfo e
// /users/update-first-login), que já cobrem exatamente a mesma necessidade.
router.post("/registerEntry", requireAuth, registerEntry);
router.post("/registerLeave", requireAuth, registerLeave);
router.post("/calendar", requireAuth, getUserRecords);
router.post("/checkEntry", requireAuth, checkEntry);
router.post("/checkLeave", requireAuth, checkLeave);
router.post("/checkTimeTracking", requireAuth, checkTimeTracking);
router.post("/update-time", requireAuth, updateUserTime);
router.post("/vacation", requireAuth, createVacation);
router.post("/medicalLeave", requireAuth, createMedicalLeave);
router.post("/overtime-summary", requireAuth, getOvertimeSummary);
router.post("/yearly-summary", requireAuth, getYearlySummary);
router.post("/register-manual-overtime", requireAuth, registerManualOvertime);
router.post("/get-manual-overtime", requireAuth, getManualOvertimeForMonth);
router.put("/update-manual-overtime", requireAuth, updateManualOvertime);
router.delete("/delete-manual-overtime", requireAuth, deleteManualOvertime);
router.get("/ping", requireAuth, ping);
// Calendário de férias de toda a equipa — informação visível a qualquer
// colaborador autenticado (não é dado sensível de admin), usado tanto pela
// vista de admin como pelo calendário que aparece ao próprio colaborador.
router.post("/all-vacations", requireAuth, getAllUsersVacations);

// Mapa de férias (grelha company-wide): leitura aberta a qualquer autenticado;
// escrita permite auto-edição da própria linha OU edição de outra linha por
// admin/GestorRH — regra mista que não cabe em requireAdmin (só SuperAdmin)
// nem em requireAdminOrHR sozinho (bloquearia a auto-edição do próprio user),
// por isso a validação de permissão vive dentro do próprio controller.
router.post("/vacation-map", requireAuth, getVacationMap);
router.post("/toggle-vacation-day", requireAuth, toggleVacationDay);
router.post("/vacation-quota-override", requireAuth, requireAdminOrHR, setVacationQuotaOverride);
router.post("/vacation-carryover", requireAuth, requireAdminOrHR, setVacationCarryover);

// Administração (gestão de outros utilizadores / dados cross-user)
router.post("/userDetails", requireAuth, requireAdmin, userDetails);
router.post('/createUser', requireAuth, requireAdmin, createUser);
router.post("/byEntity", requireAuth, requireAdmin, getUsersByEntity);
router.post("/updateUserDetails", requireAuth, requireAdmin, updateUserDetails);
router.post("/approve-vacation", requireAuth, requireAdmin, approveVacation);
router.post("/reject-vacation", requireAuth, requireAdmin, rejectVacation);
router.post("/pending-vacations", requireAuth, requireAdmin, getPendingVacations);
router.post("/process-overtime-deduction", requireAuth, requireAdmin, processOvertimeDeduction);
router.post("/clear-overtime-deductions", requireAuth, requireAdmin, clearOvertimeDeductions);
router.post("/debug-corrupt-overtime", requireAuth, requireAdmin, debugCorruptOvertime);
router.post("/delete-corrupt-overtime", requireAuth, requireAdmin, deleteCorruptOvertime);
router.delete("/deleteRegister", requireAuth, requireAdmin, deleteRegister);
router.post("/deleteUser", requireAuth, requireAdmin, deleteUser);

module.exports = router;
