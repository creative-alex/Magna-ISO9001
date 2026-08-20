const admin = require("firebase-admin");
const db = require("../db/firebase").db;

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Token nao fornecido" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    let userDoc = await db.collection("users").doc(decodedToken.uid).get();
    let userData = {};

    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      const querySnapshot = await db.collection("users").where("email", "==", decodedToken.email).get();
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      nome: userData.nome || decodedToken.name || null,
      // "role" é só o cargo/título mostrado (texto livre, ex: "Gestora RH / Coordenadora
      // Pedagógica") — NUNCA usar para decidir permissões, usar sempre nivelAcesso.
      role: userData.role || "user",
      nivelAcesso: userData.nivelAcesso || "Colaborador",
    };

    next();
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}

function isSuperAdmin(nivelAcesso) {
  return (nivelAcesso || "").toLowerCase() === "superadmin";
}

function isAdminOrHR(nivelAcesso) {
  const nivel = (nivelAcesso || "").toLowerCase();
  return nivel === "superadmin" || nivel === "gestorrh";
}

function requireAdmin(req, res, next) {
  if (!isSuperAdmin(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}

function requireAdminOrHR(req, res, next) {
  if (!isAdminOrHR(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireAdminOrHR, isSuperAdmin, isAdminOrHR };
