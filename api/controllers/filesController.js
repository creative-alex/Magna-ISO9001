// controllers/pdfController.js
const admin = require("firebase-admin");
const bucket = admin.storage().bucket();

const getPdfFromFirebase = async (req, res) => {
  try {
    const { token, pdfPath } = req.body;
    // Exemplo: Aqui deverias validar o token (JWT, etc.)
    // if (!isValidToken(token)) return res.status(401).send("Token inválido");

    const file = bucket.file(pdfPath);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).send("Ficheiro não encontrado");

    const stream = file.createReadStream();
    res.setHeader("Content-Type", "application/pdf");
    stream.pipe(res);
  } catch (err) {
    res.status(500).send("Erro ao buscar PDF: " + err.message);
  }
};

module.exports = { getPdfFromFirebase };
