const admin = require("firebase-admin");
const { isAdminOrHR, isAdministrador, entidadeNoAmbito } = require("../../shared/middleware/auth");
const db = admin.firestore();

// Função helper para normalizar IDs de colaboradors
const normalizeUserId = (nome) => {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");
};

// Resolve de quem são os dados a aceder: por omissão o próprio utilizador
// autenticado (req.user.uid); um SuperAdmin/GestorRH pode indicar um "uid" no
// corpo do pedido para aceder aos dados de qualquer colaborador, e um
// Administrador só aos colaboradores da sua própria entidade (mesma regra já
// usada em userDetails/updateUserDetails, ver userManagementController.js).
const resolveTargetUid = async (req) => {
  const targetUid = req.body?.uid;

  if (!targetUid || targetUid === req.user.uid) {
    return { uid: req.user.uid, error: null };
  }

  if (isAdminOrHR(req.user.nivelAcesso)) {
    return { uid: targetUid, error: null };
  }

  if (isAdministrador(req.user.nivelAcesso)) {
    const targetDoc = await db.collection("users").doc(targetUid).get();
    if (targetDoc.exists && entidadeNoAmbito(req.user, targetDoc.data().entidade)) {
      return { uid: targetUid, error: null };
    }
    return { uid: null, error: "Acesso restrito a colaboradores da sua entidade" };
  }

  return { uid: null, error: "Acesso restrito a administradores" };
};

// Mesma regra de cálculo de horas de calcHours.js (frontend) e calcularHorasHelper
// (reportsController.js): pausa de 30min descontada acima de 5h trabalhadas, dia
// obrigatório de 480min (8h), só para dias de semana (fins de semana não têm falta).
function calcularMinutosFaltaDia(horaEntrada, horaSaida, date) {
  const diaSemana = date.getDay();
  if (diaSemana === 0 || diaSemana === 6) return 0;

  const [hEntrada, mEntrada] = (horaEntrada || "").split(":").map(Number);
  const [hSaida, mSaida] = (horaSaida || "").split(":").map(Number);
  if ([hEntrada, mEntrada, hSaida, mSaida].some(Number.isNaN)) return 0;

  let minutosTrabalhados = (hSaida * 60 + mSaida) - (hEntrada * 60 + mEntrada);
  if (minutosTrabalhados > 300) minutosTrabalhados -= 30;

  return Math.max(0, 480 - minutosTrabalhados);
}

module.exports = {
  normalizeUserId,
  resolveTargetUid,
  calcularMinutosFaltaDia
};
