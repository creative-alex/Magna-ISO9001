const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");

const bucket = admin.storage().bucket();

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade; o próprio colaborador só pode consultar, nunca gerir os exames.
function canRead(req, id, targetEntidade) {
  return isAdminOrHR(req.user?.nivelAcesso) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

function canManage(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// users/{id}/medicinaTrabalho/dados/exames/{exameId}
// Cada exame tem uma data_exame (passada ou futura) e, opcionalmente, uma ficha em PDF.
// "Feito" vs "Por fazer" é decidido no frontend só pela data_exame face à data de hoje  -
// não depende de existir ou não ficha anexada.

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

    const medRef = userDocRef.collection("medicinaTrabalho").doc("dados");
    const examesSnap = await medRef.collection("exames").orderBy("data_exame", "asc").get();
    const exames = examesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json({ exames });
  } catch (error) {
    console.error("Erro ao buscar medicina do trabalho:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const registarExame = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { data_exame } = req.body;
    if (!data_exame) {
      return res.status(400).json({ error: "Data do exame é obrigatória" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const medRef = userDocRef.collection("medicinaTrabalho").doc("dados");
    const exameData = {
      data_exame,
      registadoEm: admin.firestore.FieldValue.serverTimestamp(),
      registadoPor: req.user.uid,
    };

    if (req.file) {
      const safeName = req.file.originalname.replace(/[^\w.\-À-ÿ ]/g, "_");
      const filePath = `FichaAptidaoMedica/${id}/${Date.now()}_${safeName}`;
      await bucket.file(filePath).save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      exameData.ficha_nome_ficheiro = req.file.originalname;
      exameData.ficha_path = filePath;
    }

    const docRef = await medRef.collection("exames").add(exameData);

    res.json({ message: "Exame registado com sucesso", exame: { id: docRef.id, ...exameData } });
  } catch (error) {
    console.error("Erro ao registar exame médico:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const atualizarExame = async (req, res) => {
  try {
    const { id, exameId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const medRef = db.collection("users").doc(id).collection("medicinaTrabalho").doc("dados");
    const exameRef = medRef.collection("exames").doc(exameId);
    const exameDoc = await exameRef.get();
    if (!exameDoc.exists) {
      return res.status(404).json({ error: "Exame não encontrado" });
    }

    const update = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    };

    const { data_exame } = req.body;
    if (data_exame) update.data_exame = data_exame;

    if (req.file) {
      const oldPath = exameDoc.data().ficha_path;
      if (oldPath) {
        await bucket.file(oldPath).delete({ ignoreNotFound: true });
      }
      const safeName = req.file.originalname.replace(/[^\w.\-À-ÿ ]/g, "_");
      const filePath = `FichaAptidaoMedica/${id}/${Date.now()}_${safeName}`;
      await bucket.file(filePath).save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      update.ficha_nome_ficheiro = req.file.originalname;
      update.ficha_path = filePath;
    }

    await exameRef.update(update);

    res.json({ message: "Exame atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar exame médico:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const deleteExame = async (req, res) => {
  try {
    const { id, exameId } = req.params;
    if (!canManage(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const medRef = db.collection("users").doc(id).collection("medicinaTrabalho").doc("dados");
    const exameRef = medRef.collection("exames").doc(exameId);
    const exameDoc = await exameRef.get();
    if (!exameDoc.exists) {
      return res.status(404).json({ error: "Exame não encontrado" });
    }

    const { ficha_path } = exameDoc.data();
    if (ficha_path) {
      await bucket.file(ficha_path).delete({ ignoreNotFound: true });
    }
    await exameRef.delete();

    res.json({ message: "Exame removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover exame médico:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = {
  getMedicinaTrabalho,
  registarExame,
  atualizarExame,
  deleteExame,
};
