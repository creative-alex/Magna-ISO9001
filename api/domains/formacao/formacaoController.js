const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");

const bucket = admin.storage().bucket();

const ANO_REGEX = /^\d{4}$/;

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade; o próprio colaborador só pode consultar o seu plano de
// formação, nunca editar nem gerir certificados.
function canRead(req, id, targetEntidade) {
  return isAdminOrHR(req.user?.nivelAcesso) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

function canManage(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// Cada ação de formação é o seu próprio documento em
// users/{id}/formacao/{ano}/acoes/{acaoId}, já com os dados da ação e o
// certificado juntos no mesmo registo (em vez de duas listas separadas
// que era preciso emparelhar manualmente).
const ACAO_FIELD_KEYS = [
  "nome_acao", "duracao", "local", "horario", "entidade_formadora", "observacao",
];

function serializeAcao(doc) {
  const data = doc.data();
  const acao = { id: doc.id };
  ACAO_FIELD_KEYS.forEach((key) => { acao[key] = data[key] || ""; });
  acao.certificado_nome_ficheiro = data.certificado_nome_ficheiro || null;
  acao.certificado_path = data.certificado_path || null;
  return acao;
}

const getFormacao = async (req, res) => {
  try {
    const { id, ano } = req.params;
    if (!ANO_REGEX.test(ano)) {
      return res.status(400).json({ error: "Ano inválido (formato esperado AAAA)" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    if (!canRead(req, id, userDoc.data().entidade)) {
      return res.status(403).json({ error: "Sem permissão para consultar este plano de formação" });
    }

    const acoesSnapshot = await userDocRef.collection("formacao").doc(ano).collection("acoes")
      .orderBy("createdAt", "asc").get();

    res.json({ acoes: acoesSnapshot.docs.map(serializeAcao) });
  } catch (error) {
    console.error("Erro ao buscar plano de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const createAcao = async (req, res) => {
  try {
    const { id, ano } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }
    if (!ANO_REGEX.test(ano)) {
      return res.status(400).json({ error: "Ano inválido (formato esperado AAAA)" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const acaoRef = userDocRef.collection("formacao").doc(ano).collection("acoes").doc();
    const acaoData = { createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: req.user.uid };
    ACAO_FIELD_KEYS.forEach((key) => { acaoData[key] = ""; });
    await acaoRef.set(acaoData);

    const acaoDoc = await acaoRef.get();
    res.json({ acao: serializeAcao(acaoDoc) });
  } catch (error) {
    console.error("Erro ao criar ação de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const updateAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }

    const { acao } = req.body;
    if (!acao || typeof acao !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const update = {};
    ACAO_FIELD_KEYS.forEach((key) => {
      if (key in acao) update[key] = acao[key];
    });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;

    await acaoRef.set(update, { merge: true });
    res.json({ message: "Ação de formação guardada com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar ação de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const deleteAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }

    const { certificado_path } = acaoDoc.data();
    if (certificado_path) {
      await bucket.file(certificado_path).delete({ ignoreNotFound: true });
    }
    await acaoRef.delete();

    res.json({ message: "Ação de formação eliminada com sucesso" });
  } catch (error) {
    console.error("Erro ao eliminar ação de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const uploadCertificadoAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }

    const oldPath = acaoDoc.data().certificado_path;
    if (oldPath) {
      await bucket.file(oldPath).delete({ ignoreNotFound: true });
    }

    const safeName = req.file.originalname.replace(/[^\w.\-À-ÿ ]/g, "_");
    const filePath = `CertificadosFormacao/${id}/${ano}/${acaoId}_${safeName}`;
    await bucket.file(filePath).save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    await acaoRef.set({
      certificado_nome_ficheiro: req.file.originalname,
      certificado_path: filePath,
      certificado_uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
      certificado_uploaded_by: req.user.uid,
    }, { merge: true });

    res.json({
      message: "Certificado guardado com sucesso",
      certificado_nome_ficheiro: req.file.originalname,
      certificado_path: filePath,
    });
  } catch (error) {
    console.error("Erro ao guardar certificado de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const deleteCertificadoAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }

    const { certificado_path } = acaoDoc.data();
    if (certificado_path) {
      await bucket.file(certificado_path).delete({ ignoreNotFound: true });
    }

    await acaoRef.update({
      certificado_nome_ficheiro: admin.firestore.FieldValue.delete(),
      certificado_path: admin.firestore.FieldValue.delete(),
    });

    res.json({ message: "Certificado removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover certificado de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = {
  getFormacao,
  createAcao,
  updateAcao,
  deleteAcao,
  uploadCertificadoAcao,
  deleteCertificadoAcao,
};
