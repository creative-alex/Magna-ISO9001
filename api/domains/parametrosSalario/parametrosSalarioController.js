const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR } = require("../../shared/middleware/auth");

const ESCALOES = ["I", "II", "III", "IV"];

function canAccess(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

function normalizeNumber(value) {
  return value === "" || value === undefined || value === null ? null : Number(value);
}

const getParametros = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const [geralDoc, escaloesDoc] = await Promise.all([
      db.collection("parametrosSalario").doc("geral").get(),
      db.collection("parametrosSalario").doc("escaloes").get(),
    ]);
    const geral = geralDoc.exists ? geralDoc.data() : {};
    const escaloesData = escaloesDoc.exists ? escaloesDoc.data() : {};

    res.json({
      valor_subsidio_alimentacao: geral.valor_subsidio_alimentacao ?? "",
      valor_km_deslocacao: geral.valor_km_deslocacao ?? "",
      escaloes: ESCALOES.map(escalao => ({
        escalao,
        valor_bruto: escaloesData[escalao]?.valor_bruto ?? "",
        valor_isencao_horario_trabalho: escaloesData[escalao]?.valor_isencao_horario_trabalho ?? "",
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar parâmetros de salário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const updateParametros = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { valor_subsidio_alimentacao, valor_km_deslocacao, escaloes } = req.body;

    const escaloesUpdate = {};
    if (Array.isArray(escaloes)) {
      escaloes.forEach(e => {
        if (!ESCALOES.includes(e.escalao)) return;
        escaloesUpdate[e.escalao] = {
          valor_bruto: normalizeNumber(e.valor_bruto),
          valor_isencao_horario_trabalho: e.escalao === "I" ? null : normalizeNumber(e.valor_isencao_horario_trabalho),
        };
      });
    }

    await Promise.all([
      db.collection("parametrosSalario").doc("geral").set({
        valor_subsidio_alimentacao: normalizeNumber(valor_subsidio_alimentacao),
        valor_km_deslocacao: normalizeNumber(valor_km_deslocacao),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: req.user.uid,
      }, { merge: true }),
      db.collection("parametrosSalario").doc("escaloes").set({
        ...escaloesUpdate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: req.user.uid,
      }, { merge: true }),
    ]);

    res.json({ message: "Parâmetros guardados com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar parâmetros de salário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getParametros, updateParametros };
