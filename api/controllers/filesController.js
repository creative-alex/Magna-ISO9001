// controllers/pdfController.js
const admin = require("firebase-admin");
const { PDFDocument } = require('pdf-lib');

// Configuração do Firebase (será inicializada no server.js)
const bucket = admin.storage().bucket();

console.log("pdfController.js carregado, bucket configurado");

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
    console.log("req.body:", req.body);
    console.log("servicos_entrada:", req.body.servicos_entrada);
    console.log("servico_saida:", req.body.servico_saida);
    console.log("Verificando req.file...");
    if (!req.file) {
      console.log("Nenhum ficheiro enviado.");
      return res.status(400).send("Nenhum ficheiro enviado.");
    }

    console.log("Extraindo folders e filename...");
    const folders = req.body.folders ? JSON.parse(req.body.folders) : [];
    const filename = req.body.filename || req.file.originalname;
    const filePath = [...folders, filename].join("/");
    console.log("filePath construído:", filePath);

    console.log("Criando blob para upload...");
    const blob = bucket.file(filePath);
    console.log("Blob criado, iniciando upload...");

    // Upload direto usando save()
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      }
    });
    console.log("PDF guardado com sucesso!");

    res.status(200).send("PDF guardado com sucesso!");
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).send("Erro ao guardar PDF: " + err.message);
  }
};

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

    console.log("Baixando PDF...");
    const file = bucket.file(filename); // Usa o caminho completo
    const [buffer] = await file.download();
    console.log("PDF baixado:", filename);

    console.log("Carregando PDF com pdf-lib...");
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();

    console.log("Extraindo campos do formulário...");
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
  console.log("buildTree chamado");
  const root = [];

  console.log("Adicionando pastas...");
  for (const folderPath of folderPaths) {
    console.log("Processando pasta:", folderPath);
    const parts = folderPath.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      let node = current.find(n => n.name === name && n.type === "folder");
      if (!node) {
        node = { name, type: "folder", children: [] };
        current.push(node);
        console.log("Pasta adicionada:", name);
      }
      current = node.children;
    }
  }
  console.log("Pastas adicionadas com sucesso.");

  console.log("Adicionando arquivos PDF...");
  for (const path of pdfPaths) {
    console.log("Processando arquivo:", path);
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
        console.log(isFile ? "Arquivo adicionado:" : "Pasta adicionada:", name);
      }
      if (!isFile) current = node.children;
    }
  }
  console.log("Arquivos PDF adicionados com sucesso.");

  console.log("Árvore construída:", JSON.stringify(root, null, 2));
  return root;
}

const listPdfsTree = async (req, res) => {
  try {
    console.log("listPdfsTree chamado");
    const [files] = await bucket.getFiles();
    const pdfPaths = files
      .filter(f => f.name.endsWith(".pdf"))
      .map(f => f.name);
    console.log("PDFs encontrados:", pdfPaths);
    const tree = buildTree(pdfPaths);
    res.json(tree);
  } catch (err) {
    console.error("Erro em listPdfsTree:", err);
    res.status(500).send("Erro ao listar PDFs: " + err.message);
  }
};

const getPdf = async (req, res) => {
  try {
    console.log("getPdf chamado");
    const { path } = req.body;
    console.log("Path recebido:", path);
    if (!path) {
      console.log("Path não fornecido");
      return res.status(400).send("Path não fornecido");
    }

    console.log("Baixando PDF...");
    const file = bucket.file(path);
    const [buffer] = await file.download();
    console.log("PDF baixado com sucesso:", path);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(path.split('/').pop())}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao buscar PDF:", err);
    res.status(500).send("Erro ao buscar PDF: " + err.message);
  }
};

const downloadPdf = async (req, res) => {
  try {
    console.log("downloadPdf chamado");
    const { path } = req.body;
    console.log("Path recebido para download:", path);
    if (!path) {
      console.log("Path não fornecido");
      return res.status(400).send("Path não fornecido");
    }

    const file = bucket.file(path);
    console.log("Verificando se o arquivo existe:", path);
    const [exists] = await file.exists();
    if (!exists) {
      console.log("Arquivo não encontrado:", path);
      return res.status(404).send("Arquivo não encontrado");
    }

    console.log("Fazendo download do arquivo:", path);
    const [buffer] = await file.download();
    console.log("Download concluído, tamanho do buffer:", buffer.length);
    
    // Define o nome do arquivo para download
    const filename = path.split('/').pop();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao fazer download do PDF:", err);
    res.status(500).send("Erro ao fazer download do PDF: " + err.message);
  }
};

const updateDonoProcesso = async (req, res) => {
  try {
    console.log("updateDonoProcesso chamado");
    const { filename, donoProcesso } = req.body;
    
    if (!filename || donoProcesso === undefined) {
      return res.status(400).json({ error: "filename e donoProcesso são obrigatórios" });
    }

    console.log("Atualizando donoProcesso:", { filename, donoProcesso });

    // Acessa a coleção processos no Firestore
    const db = admin.firestore();
    const processosRef = db.collection('processos');

    // Busca o documento pelo filename
    const querySnapshot = await processosRef.where('filename', '==', filename).get();
    
    if (querySnapshot.empty) {
      console.log("Documento não encontrado para o filename:", filename);
      return res.status(404).json({ error: "Processo não encontrado" });
    }

    // Atualiza o primeiro documento encontrado
    const doc = querySnapshot.docs[0];
    await doc.ref.update({
      donoProcesso: donoProcesso,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("donoProcesso atualizado com sucesso");
    res.json({ success: true, message: "Dono do processo atualizado com sucesso" });

  } catch (error) {
    console.error("Erro ao atualizar donoProcesso:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

module.exports = {
  uploadPdf,
  listPdfs,
  getPdfFormData,
  listPdfsTree,
  getPdf,
  downloadPdf,
  updateDonoProcesso,
};
