const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade; o próprio colaborador só pode consultar, nunca editar.
function canRead(req, id, targetEntidade) {
  return isAdminOrHR(req.user?.nivelAcesso) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

function canManage(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// Cada prémio é o seu próprio documento em users/{id}/premios/{premioId}  -  uma
// lista repetível (não um valor fixo), para dar espaço a quantos prémios forem
// precisos. "recebido" já não é um campo guardado: é sempre derivado de a
// última data de transferência já ter passado (ver isRecebido) e é recalculado
// em cada leitura, por isso um prémio "salta" sozinho para "Recebidos" assim
// que essa data chega, sem ninguém ter de o marcar à mão.
// "numero_transferencias" controla o comprimento de "datas_transferencia"  -
// uma data por transferência, nunca mais nem menos do que o número indicado
// (ver clampDatasTransferencia), com um máximo de 4 (mesmo limite do <select>
// no frontend  -  aqui só a validar de novo, nunca a confiar no cliente).
const PREMIO_TEXT_FIELD_KEYS = ["nome_premio", "valor", "numero_transferencias"];
const MAX_TRANSFERENCIAS = 4;

function clampDatasTransferencia(numeroTransferencias, datas) {
  const n = Math.min(MAX_TRANSFERENCIAS, Math.max(0, parseInt(numeroTransferencias, 10) || 0));
  const existing = Array.isArray(datas) ? datas : [];
  return Array.from({ length: n }, (_, i) => existing[i] || "");
}

// Só a ÚLTIMA transferência conta: se ainda não tiver data definida, ou a
// data ainda não tiver passado, o prémio continua "a receber".
function isRecebido(datasTransferencia) {
  if (!Array.isArray(datasTransferencia) || datasTransferencia.length === 0) return false;
  const ultimaData = datasTransferencia[datasTransferencia.length - 1];
  if (!ultimaData) return false;
  const parsed = new Date(ultimaData);
  if (Number.isNaN(parsed.getTime())) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed <= hoje;
}

function serializePremio(doc) {
  const data = doc.data();
  const premio = { id: doc.id };
  PREMIO_TEXT_FIELD_KEYS.forEach((key) => { premio[key] = data[key] || ""; });
  premio.datas_transferencia = clampDatasTransferencia(data.numero_transferencias, data.datas_transferencia);
  premio.numero_transferencias = String(premio.datas_transferencia.length);
  premio.recebido = isRecebido(premio.datas_transferencia);
  return premio;
}

const getPremios = async (req, res) => {
  try {
    const { id } = req.params;

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    if (!canRead(req, id, userDoc.data().entidade)) {
      return res.status(403).json({ error: "Sem permissão para consultar os prémios deste colaborador" });
    }

    const premiosSnapshot = await userDocRef.collection("premios").orderBy("createdAt", "asc").get();
    res.json({ premios: premiosSnapshot.docs.map(serializePremio) });
  } catch (error) {
    console.error("Erro ao buscar prémios:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const createPremio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const premioRef = userDocRef.collection("premios").doc();
    const premioData = { createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: req.user.uid };
    PREMIO_TEXT_FIELD_KEYS.forEach((key) => { premioData[key] = ""; });
    premioData.datas_transferencia = [];
    await premioRef.set(premioData);

    const premioDoc = await premioRef.get();
    res.json({ premio: serializePremio(premioDoc) });
  } catch (error) {
    console.error("Erro ao criar prémio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const updatePremio = async (req, res) => {
  try {
    const { id, premioId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const premioRef = db.collection("users").doc(id).collection("premios").doc(premioId);
    const premioDoc = await premioRef.get();
    if (!premioDoc.exists) {
      return res.status(404).json({ error: "Prémio não encontrado" });
    }

    const { premio } = req.body;
    if (!premio || typeof premio !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const update = {};
    PREMIO_TEXT_FIELD_KEYS.forEach((key) => {
      if (key in premio) update[key] = premio[key];
    });
    if ("datas_transferencia" in premio || "numero_transferencias" in premio) {
      const numeroTransferencias = "numero_transferencias" in premio ? premio.numero_transferencias : premioDoc.data().numero_transferencias;
      update.datas_transferencia = clampDatasTransferencia(numeroTransferencias, premio.datas_transferencia);
    }
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;

    await premioRef.set(update, { merge: true });

    const updatedDoc = await premioRef.get();
    res.json({ premio: serializePremio(updatedDoc) });
  } catch (error) {
    console.error("Erro ao guardar prémio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const deletePremio = async (req, res) => {
  try {
    const { id, premioId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const premioRef = db.collection("users").doc(id).collection("premios").doc(premioId);
    const premioDoc = await premioRef.get();
    if (!premioDoc.exists) {
      return res.status(404).json({ error: "Prémio não encontrado" });
    }

    await premioRef.delete();
    res.json({ message: "Prémio eliminado com sucesso" });
  } catch (error) {
    console.error("Erro ao eliminar prémio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getPremios, createPremio, updatePremio, deletePremio };
