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

    // Recebe o array de pastas e o nome do ficheiro
    const folders = req.body.folders ? JSON.parse(req.body.folders) : [];
    const filename = req.body.filename || req.file.originalname;

    // Junta tudo para formar o path
    const filePath = [...folders, filename].join("/");

    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      res.status(500).send("Erro ao guardar PDF: " + err.message);
    });

    blobStream.on("finish", () => {
      res.status(200).send("PDF guardado com sucesso!");
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
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

// Função utilitária para construir a árvore
function buildTree(paths) {
  const root = [];
  console.log("Iniciando buildTree...");
  for (const path of paths) {
    console.log(`\nProcessando path: "${path}"`);
    const parts = path.split("/");
    console.log("Parts:", parts);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = name.endsWith(".pdf") && i === parts.length - 1;
      console.log(`  Parte ${i}: "${name}" (${isFile ? "file" : "folder"})`);
      let node = current.find(n => n.name === name);
      if (node) {
        console.log(`    Encontrado node existente:`, node);
      } else {
        node = {
          name,
          type: isFile ? "file" : "folder",
        };
        if (!isFile) node.children = [];
        current.push(node);
        console.log(`    Criado novo node:`, node);
      }
      if (!isFile) {
        console.log(`    Descendo para children de "${name}"`);
        current = node.children;
      } else {
        console.log(`    "${name}" é um arquivo, não desce mais.`);
      }
    }
    console.log("Estado atual da árvore:", JSON.stringify(root, null, 2));
  }
  console.log("\nÁrvore final construída:");
  console.log(JSON.stringify(root, null, 2));
  return root;
}


const listPdfsTree = async (req, res) => {
  try {
    console.log("listPdfsTree chamado");
    const [files] = await bucket.getFiles();
    const pdfPaths = files
      .filter(f => f.name.endsWith(".pdf"))
      .map(f => f.name);
    const tree = buildTree(pdfPaths);
    res.json(tree);
  } catch (err) {
    console.error("Erro em listPdfsTree:", err);
    res.status(500).send("Erro ao listar PDFs: " + err.message);
  }
};

module.exports = {
  getPdfText,
  uploadPdf,
  listPdfs,
  getPdfFormData,
  listPdfsTree, 
};
