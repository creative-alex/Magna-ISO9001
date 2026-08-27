const { isAdminOrHR } = require("../../shared/middleware/auth");

// Função helper para normalizar IDs de colaboradors
const normalizeUserId = (nome) => {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");
};

// Resolve de quem são os dados a aceder: por omissão o próprio utilizador
// autenticado (req.user.uid); só um SuperAdmin pode indicar um "uid" no
// corpo do pedido para aceder aos dados de outro colaborador.
const resolveTargetUid = (req) => {
  const targetUid = req.body?.uid;

  if (!targetUid || targetUid === req.user.uid) {
    return { uid: req.user.uid, error: null };
  }

  if (!isAdminOrHR(req.user.nivelAcesso)) {
    return { uid: null, error: "Acesso restrito a administradores" };
  }

  return { uid: targetUid, error: null };
};

module.exports = {
  normalizeUserId,
  resolveTargetUid
};
