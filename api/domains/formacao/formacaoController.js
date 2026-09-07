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
  "nome_acao", "duracao", "local", "horario", "entidade_formadora", "objetivos", "prazo_ano",
];

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function serializeAcao(doc) {
  const data = doc.data();
  // O documento vive em users/{id}/formacao/{ano}/acoes/{acaoId}: o "ano" onde
  // ficou guardado (doc.ref.parent.parent) pode não ser o ano em que aparece no
  // ecrã (ver getFormacao), por isso o frontend precisa de o saber para apontar
  // aos endpoints de PUT/DELETE/certificado desta ação em concreto.
  const acao = { id: doc.id, ano_armazenamento: doc.ref.parent.parent.id };
  ACAO_FIELD_KEYS.forEach((key) => { acao[key] = data[key] || ""; });
  acao.certificado_nome_ficheiro = data.certificado_nome_ficheiro || null;
  acao.certificado_path = data.certificado_path || null;
  // Estado da ação: o RH coloca-a "por fazer" (default) e tanto o RH como o
  // próprio colaborador a podem marcar como concluída (ver marcarConcluidaAcao).
  acao.concluida = !!data.concluida;
  acao.data_conclusao = data.data_conclusao || null;
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

    // Uma ação "por fazer" não fica presa ao ano em que foi criada  -  continua a
    // aparecer todos os anos seguintes até ser concluída. Uma ação concluída só
    // aparece no ano em que caiu a data de conclusão, seja qual for o ano (bucket)
    // onde ficou fisicamente guardada. Por isso é preciso varrer todos os anos.
    const anosRefs = await userDocRef.collection("formacao").listDocuments();
    const anosSnapshots = await Promise.all(anosRefs.map((anoRef) => anoRef.collection("acoes").get()));

    const candidatos = anosSnapshots.flatMap((snapshot) => snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        acao: serializeAcao(doc),
        createdAtMillis: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
      };
    }));

    const acoesVisiveis = candidatos
      .filter(({ acao }) => !acao.concluida || (acao.data_conclusao || "").slice(0, 4) === ano)
      .sort((a, b) => a.createdAtMillis - b.createdAtMillis)
      .map(({ acao }) => acao);

    res.json({ acoes: acoesVisiveis });
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
    const acaoData = {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      concluida: false,
    };
    ACAO_FIELD_KEYS.forEach((key) => { acaoData[key] = ""; });
    await acaoRef.set(acaoData);

    const acaoDoc = await acaoRef.get();
    res.json({ acao: serializeAcao(acaoDoc) });
  } catch (error) {
    console.error("Erro ao criar ação de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Além das ações "por fazer" que o RH atribui, o colaborador pode registar por
// iniciativa própria uma formação que já fez  -  já entra criada como concluída,
// com os dados preenchidos por ele e a respetiva data de conclusão.
const criarAcaoConcluida = async (req, res) => {
  try {
    const { id, ano } = req.params;
    if (req.user?.uid !== id) {
      return res.status(403).json({ error: "Apenas o colaborador pode adicionar uma ação de formação já concluída" });
    }
    if (!ANO_REGEX.test(ano)) {
      return res.status(400).json({ error: "Ano inválido (formato esperado AAAA)" });
    }

    const { acao, dataConclusao } = req.body || {};
    if (!acao || typeof acao !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    if (!DATA_REGEX.test(dataConclusao || "")) {
      return res.status(400).json({ error: "Indica a data de conclusão (formato AAAA-MM-DD)" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const acaoRef = userDocRef.collection("formacao").doc(ano).collection("acoes").doc();
    const acaoData = {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      concluida: true,
      data_conclusao: dataConclusao,
      concluidaAt: admin.firestore.FieldValue.serverTimestamp(),
      concluidaBy: req.user.uid,
    };
    ACAO_FIELD_KEYS.forEach((key) => { acaoData[key] = acao[key] || ""; });
    await acaoRef.set(acaoData);

    const acaoDoc = await acaoRef.get();
    res.json({ acao: serializeAcao(acaoDoc) });
  } catch (error) {
    console.error("Erro ao adicionar ação de formação concluída:", error);
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
    if ("concluida" in acao) update.concluida = !!acao.concluida;
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;

    await acaoRef.set(update, { merge: true });
    res.json({ message: "Ação de formação guardada com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar ação de formação:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// O colaborador não pode editar a ação de formação, mas pode marcar como
// concluída uma ação que o RH colocou "por fazer"  -  nunca a reverter (isso
// mantém-se uma operação de gestão, restrita a canManage).
const marcarConcluidaAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    const isSelf = req.user?.uid === id;
    if (!canManage(req) && !isSelf) {
      return res.status(403).json({ error: "Sem permissão para atualizar esta ação de formação" });
    }

    const { dataConclusao } = req.body || {};
    if (!DATA_REGEX.test(dataConclusao || "")) {
      return res.status(400).json({ error: "Indica a data de conclusão (formato AAAA-MM-DD)" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }
    if (acaoDoc.data().concluida) {
      return res.status(400).json({ error: "Esta ação já está marcada como concluída" });
    }

    await acaoRef.set({
      concluida: true,
      data_conclusao: dataConclusao,
      concluidaAt: admin.firestore.FieldValue.serverTimestamp(),
      concluidaBy: req.user.uid,
    }, { merge: true });

    res.json({ message: "Ação de formação marcada como concluída" });
  } catch (error) {
    console.error("Erro ao marcar ação de formação como concluída:", error);
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

// O certificado é a prova de que o colaborador concluiu a ação, por isso só o
// próprio colaborador ou o RH/SuperAdmin o podem carregar, e só depois de a
// ação estar marcada como concluída.
const uploadCertificadoAcao = async (req, res) => {
  try {
    const { id, ano, acaoId } = req.params;
    if (req.user?.uid !== id && !canManage(req)) {
      return res.status(403).json({ error: "Sem permissão para adicionar o certificado desta ação de formação" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }

    const acaoRef = db.collection("users").doc(id).collection("formacao").doc(ano).collection("acoes").doc(acaoId);
    const acaoDoc = await acaoRef.get();
    if (!acaoDoc.exists) {
      return res.status(404).json({ error: "Ação de formação não encontrada" });
    }
    if (!acaoDoc.data().concluida) {
      return res.status(400).json({ error: "A ação tem de estar concluída antes de adicionar o certificado" });
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
    if (req.user?.uid !== id && !canManage(req)) {
      return res.status(403).json({ error: "Sem permissão para remover o certificado desta ação de formação" });
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
  criarAcaoConcluida,
  updateAcao,
  marcarConcluidaAcao,
  deleteAcao,
  uploadCertificadoAcao,
  deleteCertificadoAcao,
};
