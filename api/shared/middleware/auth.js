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
      // Pedagógica")  -  NUNCA usar para decidir permissões, usar sempre nivelAcesso.
      role: userData.role || "user",
      nivelAcesso: userData.nivelAcesso || "Colaborador",
      // Referência "entidades/<id>" da entidade a que o utilizador pertence. Usada para
      // limitar o que um "Administrador" (nível intermédio, ver isAdministrador) pode
      // ver/gerir aos colaboradores da sua própria entidade.
      entidade: userData.entidade || null,
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

// Nível intermédio entre "Colaborador" e "GestorRH": vê os dados de cadastro/salário/
// formação dos colaboradores da sua própria entidade (nunca de outras) e pode gerir
// (criar/editar/apagar) as respetivas contas, mas sem os direitos de edição de RH
// (contrato, salário, plano de formação) nem acesso fora da sua entidade.
function isAdministrador(nivelAcesso) {
  return (nivelAcesso || "").toLowerCase() === "administrador";
}

// Usado nos sítios (cadastro/salário/formação) onde o Administrador só deve poder
// LER dados de outro colaborador  -  quem chama ainda tem de confirmar que a entidade
// do colaborador-alvo é igual a req.user.entidade antes de conceder acesso.
function isAdminOrHRorAdministrador(nivelAcesso) {
  return isAdminOrHR(nivelAcesso) || isAdministrador(nivelAcesso);
}

// SuperAdmin + Administrador (exclui GestorRH de propósito, para manter a mesma
// exclusão que já existia para a gestão de utilizadores antes deste nível existir).
function isSuperAdminOrAdministrador(nivelAcesso) {
  return isSuperAdmin(nivelAcesso) || isAdministrador(nivelAcesso);
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

// Gestão de contas de colaboradores (criar/editar/apagar): SuperAdmin sem restrições,
// Administrador só dentro da sua própria entidade  -  essa segunda parte da validação
// vive no controller (precisa de ler a entidade do colaborador-alvo).
function requireAdminOrEntidadeAdmin(req, res, next) {
  if (!isSuperAdminOrAdministrador(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}

// Ver a lista de colaboradores (cadastro/salário/formação): admin/RH vê todos,
// Administrador só os da sua entidade  -  filtragem feita no controller.
function requireCanViewColaboradores(req, res, next) {
  if (!isAdminOrHRorAdministrador(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireAdminOrHR,
  requireAdminOrEntidadeAdmin,
  requireCanViewColaboradores,
  isSuperAdmin,
  isAdminOrHR,
  isAdministrador,
  isAdminOrHRorAdministrador,
  isSuperAdminOrAdministrador,
};
