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
    // true só quando o documento existe mesmo em users/{uid} (não no caso raro do
    // fallback por email abaixo, dados legados com outro ID de documento) - controllers
    // de autoconsulta usam isto para saber se podem reaproveitar userData em vez de
    // fazer o seu próprio users/{id}.get(), sem arriscar divergir do que esse get()
    // devolveria (ver requireAuth/req.userData mais abaixo).
    let userDocExists = false;

    if (userDoc.exists) {
      userData = userDoc.data();
      userDocExists = true;
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
      role: userData.role,
      nivelAcesso: userData.nivelAcesso,
      // Referência "entidades/<id>" da entidade a que o utilizador pertence. Usada para
      // limitar o que um "Administrador" (nível intermédio, ver isAdministrador) pode
      // ver/gerir aos colaboradores da sua própria entidade.
      entidade: userData.entidade || null,
      // Caso raro de um Administrador que gere mais do que uma entidade: refs
      // "entidades/<id>" adicionais, para além de "entidade" acima  -  ver
      // entidadesGeridasPor/entidadeNoAmbito.
      entidadesGeridas: userData.entidadesGeridas || null,
    };

    // Dados brutos do próprio documento já lido acima (users/{uid}) - endpoints de
    // autoconsulta (cadastro/salário/formação/prémios/medicina/favoritos) reaproveitam
    // isto em vez de reler o mesmo documento, quando o pedido é sobre o próprio
    // utilizador e req.userDocExists é true (ver nota acima).
    req.userData = userData;
    req.userDocExists = userDocExists;

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

function isGestorRH(nivelAcesso) {
  return (nivelAcesso || "").toLowerCase() === "gestorrh";
}

// Nível intermédio entre "Colaborador" e "GestorRH": vê e edita o cadastro (incluindo
// os campos de contrato/estágio, ver canEditRestricted em cadastroController.js) dos
// colaboradores da sua própria entidade (nunca de outras) e pode gerir (criar/editar/
// apagar) as respetivas contas, mas sem os direitos de edição de RH em salário/plano de
// formação nem acesso fora da sua entidade.
function isAdministrador(nivelAcesso) {
  return (nivelAcesso || "").toLowerCase() === "administrador";
}

// Todas as entidades (refs "entidades/<id>") geridas por um Administrador: a sua
// "entidade" principal mais qualquer entidade adicional em "entidadesGeridas" - caso
// raro de um Administrador responsável por mais do que uma entidade. Aceita tanto
// req.user como um userData de Firestore (mesmo formato dos dois campos).
function entidadesGeridasPor(user) {
  const geridas = new Set();
  if (user?.entidade) geridas.add(user.entidade);
  if (Array.isArray(user?.entidadesGeridas)) {
    user.entidadesGeridas.forEach((ref) => { if (ref) geridas.add(ref); });
  }
  return [...geridas];
}

// Verifica se a entidade de um colaborador-alvo está dentro do âmbito de gestão de um
// Administrador. Usar em vez de comparar "=== req.user.entidade" diretamente, para
// suportar o caso de um Administrador com mais do que uma entidade (ver
// entidadesGeridasPor); quem chama continua responsável por confirmar isAdministrador
// primeiro, já que esta função por si só nada diz sobre o nível de acesso.
function entidadeNoAmbito(user, targetEntidade) {
  return !!targetEntidade && entidadesGeridasPor(user).includes(targetEntidade);
}

// Usado nos sítios (cadastro/salário/formação) onde o Administrador só deve poder
// LER dados de outro colaborador  -  quem chama ainda tem de confirmar que a entidade
// do colaborador-alvo é igual a req.user.entidade antes de conceder acesso.
function isAdminOrHRorAdministrador(nivelAcesso) {
  return isAdminOrHR(nivelAcesso) || isAdministrador(nivelAcesso);
}

// Nível dedicado à área financeira: a par do SuperAdmin, é o único com direito de
// EDIÇÃO em Processamento de Salários e Prémios. GestorRH mantém leitura nestas
// duas áreas (continua incluído em isAdminOrHR) mas deixou de as poder editar  -
// separação de funções entre RH e Financeiro pedida explicitamente.
function isGestorFinanceiro(nivelAcesso) {
  return (nivelAcesso || "").toLowerCase() === "gestorfinanceiro";
}

function isSuperAdminOrGestorFinanceiro(nivelAcesso) {
  return isSuperAdmin(nivelAcesso) || isGestorFinanceiro(nivelAcesso);
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

// Gestão de contas de colaboradores (criar/editar/apagar): SuperAdmin e GestorRH sem
// restrições, Administrador só dentro da sua própria entidade  -  essa segunda parte da
// validação vive no controller (precisa de ler a entidade do colaborador-alvo).
function requireAdminOrEntidadeAdmin(req, res, next) {
  if (!isAdminOrHRorAdministrador(req.user?.nivelAcesso)) {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}

// Ver a lista de colaboradores (cadastro/salário/formação/prémios): admin/RH/Gestor
// Financeiro vê todos, Administrador só os da sua entidade  -  filtragem feita no
// controller (getColaboradores).
function requireCanViewColaboradores(req, res, next) {
  if (!isAdminOrHRorAdministrador(req.user?.nivelAcesso) && !isGestorFinanceiro(req.user?.nivelAcesso)) {
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
  isGestorRH,
  isAdministrador,
  entidadesGeridasPor,
  entidadeNoAmbito,
  isAdminOrHRorAdministrador,
  isGestorFinanceiro,
  isSuperAdminOrGestorFinanceiro,
};
