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

// Função utilitária para construir a árvore
function buildTree(paths) {
  const root = [];
  console.log("Iniciando buildTree...");
  for (const path of paths) {
    console.log(`\nProcessando path: "${path}"`);
    const parts = path.split("/");
    console.log("Parts:", parts);
    let current = root;
    let currentPath = [];
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      currentPath.push(name);
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
        if (isFile) {
          node.path = currentPath.join("/"); // <-- Adiciona o caminho completo
        } else {
          node.children = [];
        }
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
