// controllers/pdfController.js
const admin = require("firebase-admin");
const { PDFDocument } = require('pdf-lib');

// Configuração do Firebase (será inicializada no server.js)
const bucket = admin.storage().bucket();

const getPdfText = async (req, res) => {
  try {
    console.log("getPdfText chamado");
    const [files] = await bucket.getFiles();
    console.log("Arquivos encontrados:", files.map(f => f.name));
    const pdfFile = files.find(f => f.name.endsWith(".pdf"));
    if (!pdfFile) {
      console.log("Nenhum PDF encontrado");
      return res.status(404).send("Nenhum PDF encontrado");
    }

    const [buffer] = await pdfFile.download();
    console.log("PDF baixado:", pdfFile.name);
    const data = await pdfParse(buffer);

    const lines = data.text.split('\n').map(line => line.trim()).filter(Boolean);
    console.log("Linhas extraídas:", lines);
    res.json({ lines });
  } catch (err) {
    console.error("Erro em getPdfText:", err);
    res.status(500).send("Erro ao extrair texto do PDF: " + err.message);
  }
};
const listPdfs = async (req, res) => {
  try {
    console.log("listPdfs chamado");
    const [files] = await bucket.getFiles();
    console.log("Arquivos encontrados:", files.map(f => f.name));
    const pdfFiles = files
      .filter(f => f.name.endsWith(".pdf"))
      .map(f => f.name);
    console.log("PDFs filtrados:", pdfFiles);
    res.json(pdfFiles);
  } catch (err) {
    console.error("Erro em listPdfs:", err);
    res.status(500).send("Erro ao listar PDFs: " + err.message);
  }
};

const uploadPdf = async (req, res) => {
  try {
    console.log("uploadPdf chamado");
    if (!req.file) {
      console.log("Nenhum ficheiro enviado.");
      return res.status(400).send("Nenhum ficheiro enviado.");
    }

    console.log("Nome do ficheiro:", req.file.originalname);
    const blob = bucket.file(req.file.originalname || "uploaded.pdf");
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      console.error("Erro no blobStream:", err);
      res.status(500).send("Erro ao guardar PDF: " + err.message);
    });

    blobStream.on("finish", () => {
      console.log("Upload finalizado com sucesso!");
      res.status(200).send("PDF guardado com sucesso!");
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error("Erro em uploadPdf:", err);
    res.status(500).send("Erro ao guardar PDF: " + err.message);
  }
};

const getPdfFormData = async (req, res) => {
  try {
    console.log("getPdfFormData chamado");
    const { filename } = req.query;
    console.log("Filename recebido:", filename);
    if (!filename) {
      console.log("Ficheiro não especificado.");
      return res.status(400).send("Ficheiro não especificado.");
    }

    const file = bucket.file(filename);
    const [buffer] = await file.download();
    console.log("PDF baixado:", filename);
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();

    const fields = form.getFields();
    console.log("Campos encontrados:", fields.map(f => f.getName()));
    const data = {};
    fields.forEach(field => {
      data[field.getName()] = field.getText ? field.getText() : "";
    });

    console.log("Dados extraídos:", data);
    res.json(data);
  } catch (err) {
    console.error("Erro em getPdfFormData:", err);
    res.status(500).send("Erro ao extrair dados do PDF: " + err.message);
  }
};

module.exports = {
  getPdfText, uploadPdf, listPdfs, getPdfFormData,
};
