// controllers/pdfController.js
const admin = require("firebase-admin");
const { PDFDocument } = require('pdf-lib');

// Configuração do Firebase (será inicializada no server.js)
const bucket = admin.storage().bucket();

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

const uploadPdf  = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Nenhum ficheiro enviado.");
    }

    const folders = req.body.folders ? JSON.parse(req.body.folders) : [];
    const filename = req.body.filename || req.file.originalname;
    const filePath = [...folders, filename].join("/");

    const blob = bucket.file(filePath);
    
    // Upload direto usando save()
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      }
    });

    res.status(200).send("PDF guardado com sucesso!");
    
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).send("Erro ao guardar PDF: " + err.message);
  }
}



const getPdfFormData = async (req, res) => {
  try {
    console.log("getPdfFormData chamado");
    // Lê do body (POST), não do query
    const { filename } = req.body;
    console.log("Filename recebido:", filename);
    if (!filename) {
      console.log("Ficheiro não especificado.");
      return res.status(400).send("Ficheiro não especificado.");
    }

    const file = bucket.file(filename); // Usa o caminho completo
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

// Recebe dois arrays: pdfPaths (caminhos dos PDFs) e folderPaths (caminhos das pastas)
function buildTree(pdfPaths, folderPaths = []) {
  const root = [];

  // Adiciona todas as pastas (mesmo vazias)
  for (const folderPath of folderPaths) {
    const parts = folderPath.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      let node = current.find(n => n.name === name && n.type === "folder");
      if (!node) {
        node = { name, type: "folder", children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }

  // Adiciona os arquivos PDF
  for (const path of pdfPaths) {
    const parts = path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = name.endsWith(".pdf") && i === parts.length - 1;
      let node = current.find(n => n.name === name && (isFile ? n.type === "file" : n.type === "folder"));
      if (!node) {
        node = isFile
          ? { name, type: "file", path }
          : { name, type: "folder", children: [] };
        current.push(node);
      }
      if (!isFile) current = node.children;
    }
  }

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

const getPdf = async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).send("Path não fornecido");

    const file = bucket.file(path);
    const [buffer] = await file.download();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(path.split('/').pop())}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao buscar PDF:", err);
    res.status(500).send("Erro ao buscar PDF: " + err.message);
  }
};

module.exports = {
  uploadPdf,
  listPdfs,
  getPdfFormData,
  listPdfsTree, 
  getPdf,
};
