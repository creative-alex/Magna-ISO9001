const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");

const bucket = admin.storage().bucket();

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade; o próprio colaborador só pode consultar, nunca editar
// datas nem gerir a ficha de aptidão médica.
function canRead(req, id, targetEntidade) {
  return isAdminOrHR(req.user?.nivelAcesso) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

function canManage(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// Um único documento por colaborador em users/{id}/medicinaTrabalho/dados
// (não é preciso histórico por ano  -  só interessam as datas mais recentes).
const MEDICINA_FIELD_KEYS = ["data_ultimo_exame", "data_proximo_exame"];

const getMedicinaTrabalho = async (req, res) => {
  try {
    const { id } = req.params;

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    if (!canRead(req, id, userDoc.data().entidade)) {
      return res.status(403).json({ error: "Sem permissão para consultar a medicina do trabalho deste colaborador" });
    }

    const medDoc = await userDocRef.collection("medicinaTrabalho").doc("dados").get();
    const data = medDoc.exists ? medDoc.data() : {};

    const form = {};
    MEDICINA_FIELD_KEYS.forEach((key) => { form[key] = data[key] || ""; });

    res.json({
      form,
      ficha_nome_ficheiro: data.ficha_nome_ficheiro || null,
      ficha_path: data.ficha_path || null,
    });
  } catch (error) {
    console.error("Erro ao buscar medicina do trabalho:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const saveMedicinaTrabalho = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { form } = req.body;
    if (!form || typeof form !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const update = {};
    MEDICINA_FIELD_KEYS.forEach((key) => {
      if (key in form) update[key] = form[key];
    });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;

    await userDocRef.collection("medicinaTrabalho").doc("dados").set(update, { merge: true });

    res.json({ message: "Dados de medicina do trabalho guardados com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar medicina do trabalho:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const uploadFicha = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const medRef = userDocRef.collection("medicinaTrabalho").doc("dados");
    const medDoc = await medRef.get();
    const oldPath = medDoc.exists ? medDoc.data().ficha_path : null;
    if (oldPath) {
      await bucket.file(oldPath).delete({ ignoreNotFound: true });
    }

    const safeName = req.file.originalname.replace(/[^\w.\-À-ÿ ]/g, "_");
    const filePath = `FichaAptidaoMedica/${id}/${Date.now()}_${safeName}`;
    await bucket.file(filePath).save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    await medRef.set({
      ficha_nome_ficheiro: req.file.originalname,
      ficha_path: filePath,
      ficha_uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
      ficha_uploaded_by: req.user.uid,
    }, { merge: true });

    res.json({
      message: "Ficha guardada com sucesso",
      ficha_nome_ficheiro: req.file.originalname,
      ficha_path: filePath,
    });
  } catch (error) {
    console.error("Erro ao guardar ficha de aptidão médica:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const deleteFicha = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const medRef = db.collection("users").doc(id).collection("medicinaTrabalho").doc("dados");
    const medDoc = await medRef.get();
    if (!medDoc.exists || !medDoc.data().ficha_path) {
      return res.status(404).json({ error: "Ficha não encontrada" });
    }

    await bucket.file(medDoc.data().ficha_path).delete({ ignoreNotFound: true });
    await medRef.update({
      ficha_nome_ficheiro: admin.firestore.FieldValue.delete(),
      ficha_path: admin.firestore.FieldValue.delete(),
    });

    res.json({ message: "Ficha removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover ficha de aptidão médica:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getMedicinaTrabalho, saveMedicinaTrabalho, uploadFicha, deleteFicha };
