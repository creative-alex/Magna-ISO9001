const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;

// Documento único, partilhado por todos os utilizadores, com a lista de
// palavras do easter egg (Konami code -> Wordle) no Dashboard.
const DOC_REF = db.collection("appConfig").doc("konamiWordle");

const getWordleWords = async (req, res) => {
  try {
    const doc = await DOC_REF.get();
    const entries = doc.exists && Array.isArray(doc.data().entries) ? doc.data().entries : [];
    res.json({ entries });
  } catch (error) {
    console.error("Erro ao obter palavras do Konami Wordle:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const saveWordleWords = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "entries deve ser uma lista" });
    }

    const clean = entries
      .filter((e) => e && typeof e.word === "string" && e.word.length >= 3)
      .map((e) => ({
        word: e.word,
        ...(typeof e.hint === "string" && e.hint ? { hint: e.hint } : {}),
        ...(typeof e.entity === "string" && e.entity ? { entity: e.entity } : {}),
      }));

    await DOC_REF.set({
      entries: clean,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user?.uid || null,
    });

    res.json({ message: "Palavras guardadas com sucesso", entries: clean });
  } catch (error) {
    console.error("Erro ao guardar palavras do Konami Wordle:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getWordleWords, saveWordleWords };
