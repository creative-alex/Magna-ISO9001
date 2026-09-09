const admin = require("firebase-admin");
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");
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
    if (targetDoc.exists && targetDoc.data().entidade === req.user.entidade) {
      return { uid: targetUid, error: null };
    }
    return { uid: null, error: "Acesso restrito a colaboradores da sua entidade" };
  }

  return { uid: null, error: "Acesso restrito a administradores" };
};

module.exports = {
  normalizeUserId,
  resolveTargetUid
};
