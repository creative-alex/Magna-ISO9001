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
      role: userData.role || "user",
    };

    next();
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}

function requireAdmin(req, res, next) {
  const role = (req.user?.role || "").toLowerCase();
  if (role !== "superadmin") {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
