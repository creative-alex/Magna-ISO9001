// controllers/pdfController.js
const admin = require("firebase-admin");
const pdfParse = require('pdf-parse');

// Configuração do Firebase (será inicializada no server.js)
const bucket = admin.storage().bucket();

const getPdfText = async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const pdfFile = files.find(f => f.name.endsWith(".pdf"));
    if (!pdfFile) return res.status(404).send("Nenhum PDF encontrado");

    const [buffer] = await pdfFile.download();
    const data = await pdfParse(buffer);

    // Envia todas as linhas do texto como JSON
    const lines = data.text.split('\n').map(line => line.trim()).filter(Boolean);
    res.json({ lines });
  } catch (err) {
    res.status(500).send("Erro ao extrair texto do PDF: " + err.message);
  }
};

module.exports = {
  getPdfText,
};
