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

// Recebe um array: filePaths (caminhos dos ficheiros)
function buildTree(filePaths, folderPaths = []) {
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

  console.log("Adicionando ficheiros...");
  for (const path of filePaths) {
    console.log("Processando ficheiro:", path);
    const parts = path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1; // Último elemento é sempre um ficheiro
      let node = current.find(n => n.name === name && (isFile ? n.type === "file" : n.type === "folder"));
      if (!node) {
        node = isFile
          ? { name, type: "file", path }
          : { name, type: "folder", children: [] };
        current.push(node);
        console.log(isFile ? "Ficheiro adicionado:" : "Pasta adicionada:", name);
      }
      if (!isFile) current = node.children;
    }
  }
  console.log("Ficheiros adicionados com sucesso.");

  console.log("Árvore construída:", JSON.stringify(root, null, 2));
  return root;
}

const listFilesTree = async (req, res) => {
  try {
    console.log("listFilesTree chamado");
    const [files] = await bucket.getFiles();
    const filePaths = files
      .filter(f => !f.name.endsWith("/")) // Remove pastas vazias
      .map(f => f.name);
    console.log("Ficheiros encontrados:", filePaths);
    const tree = buildTree(filePaths);
    res.json(tree);
  } catch (err) {
    console.error("Erro em listFilesTree:", err);
    res.status(500).send("Erro ao listar ficheiros: " + err.message);
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

    console.log("Verificando se o arquivo existe:", path);
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      console.log("Arquivo não encontrado:", path);
      return res.status(404).send("Arquivo não encontrado");
    }

    console.log("Baixando arquivo...");
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    console.log("Arquivo baixado com sucesso:", path);
    console.log("Tipo de conteúdo:", metadata.contentType);

    // Define o tipo de conteúdo baseado no metadata
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(path.split('/').pop())}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao buscar arquivo:", err);
    res.status(500).send("Erro ao buscar arquivo: " + err.message);
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
    const [metadata] = await file.getMetadata();
    console.log("Download concluído, tamanho do buffer:", buffer.length);
    console.log("Metadata do arquivo:", metadata.contentType);
    
    // Define o nome do arquivo para download
    const filename = path.split('/').pop();
    
    // Define o tipo de conteúdo baseado no metadata ou na extensão
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao fazer download do arquivo:", err);
    res.status(500).send("Erro ao fazer download do arquivo: " + err.message);
  }
};

const updateDonoProcesso = async (req, res) => {
  try {
    console.log("updateDonoProcesso chamado");
    const { processId, donoProcesso } = req.body;
    
    if (!processId || donoProcesso === undefined) {
      return res.status(400).json({ error: "processId e donoProcesso são obrigatórios" });
    }

    console.log("Atualizando donoProcesso:", { processId, donoProcesso });

    // Acessa a coleção processos no Firestore
    const db = admin.firestore();
    const processosRef = db.collection('processos');

    // Busca o documento diretamente pelo ID
    console.log("Procurando documento com ID:", processId);
    
    const docRef = processosRef.doc(processId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      console.log("Documento não encontrado para o ID:", processId);
      return res.status(404).json({ error: "Processo não encontrado" });
    }

    // Atualiza o documento encontrado
    await docRef.update({
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

const getProcessOwners = async (req, res) => {
  try {
    console.log("getProcessOwners chamado");
    
    // Acessa a coleção processos no Firestore
    const db = admin.firestore();
    const processosRef = db.collection('processos');
    
    // Busca todos os documentos
    const snapshot = await processosRef.get();
    
    const owners = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      owners[doc.id] = data.donoProcesso || null;
    });
    
    console.log("Donos dos processos:", owners);
    res.json(owners);
    
  } catch (error) {
    console.error("Erro ao buscar donos dos processos:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

const deletePdf = async (req, res) => {
  try {
    console.log("deletePdf chamado");
    const { filename } = req.body;
    
    if (!filename) {
      console.log("Filename não fornecido");
      return res.status(400).json({ error: "Filename é obrigatório" });
    }
    
    console.log("Tentando eliminar ficheiro:", filename);
    
    // Verifica se o arquivo existe
    const file = bucket.file(filename);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("Arquivo não encontrado:", filename);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Elimina o arquivo
    await file.delete();
    console.log("Arquivo eliminado com sucesso:", filename);
    
    res.json({ success: true, message: "Ficheiro eliminado com sucesso" });
    
  } catch (error) {
    console.error("Erro ao eliminar ficheiro:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

// Nova função para listar documentos de uma pasta específica
const listDocumentsInFolder = async (req, res) => {
  try {
    console.log("listDocumentsInFolder chamado");
    const { folderPath } = req.body;
    
    if (!folderPath) {
      console.log("FolderPath não fornecido");
      return res.status(400).json({ error: "folderPath é obrigatório" });
    }
    
    console.log("Buscando documentos na pasta:", folderPath);
    
    // Lista todos os arquivos no bucket
    const [files] = await bucket.getFiles();
    
    // Primeiro tenta o caminho exato
    let documentsInFolder = files
      .filter(file => {
        const filePath = file.name;
        return filePath.startsWith(folderPath + '/') && filePath.endsWith('.pdf');
      })
      .map(file => {
        const fileName = file.name.replace(folderPath + '/', '');
        return fileName.replace('.pdf', '');
      });
    
    // Se não encontrou documentos, tenta variações do nome da pasta
    if (documentsInFolder.length === 0) {
      const variations = [
        // Variações com espaços diferentes (o padrão real tem 2 espaços)
        folderPath.replace('Informação Documentada  Procedimento', 'Informacao Documentada  Procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'INFORMAÇÃO DOCUMENTADA  PROCEDIMENTO'),
        folderPath.replace('Informação Documentada  Procedimento', 'informação documentada  procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'Informação documentada  procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'informacao documentada  procedimento'),
        // Variações com 1 espaço (caso alguém tenha criado assim)
        folderPath.replace('Informação Documentada  Procedimento', 'Informação Documentada Procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'Informacao Documentada Procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'INFORMAÇÃO DOCUMENTADA PROCEDIMENTO'),
        folderPath.replace('Informação Documentada  Procedimento', 'informação documentada procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'Informação documentada procedimento'),
        folderPath.replace('Informação Documentada  Procedimento', 'informacao documentada procedimento'),
        // Fallback para formatos antigos
        folderPath.replace('Informação Documentada  Procedimento', 'informação documentada'),
        folderPath.replace('Informação Documentada  Procedimento', 'Informação documentada'),
        folderPath.replace('Informação Documentada  Procedimento', 'informacao documentada')
      ];
      
      for (const variation of variations) {
        console.log("Tentando variação:", variation);
        const docs = files
          .filter(file => {
            const filePath = file.name;
            return filePath.startsWith(variation + '/') && filePath.endsWith('.pdf');
          })
          .map(file => {
            const fileName = file.name.replace(variation + '/', '');
            return fileName.replace('.pdf', '');
          });
        
        if (docs.length > 0) {
          documentsInFolder = docs;
          console.log("Encontrou documentos na variação:", variation);
          break;
        }
      }
    }
    
    console.log("Documentos encontrados:", documentsInFolder);
    res.json(documentsInFolder);
    
  } catch (error) {
    console.error("Erro ao listar documentos na pasta:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

const uploadDocument = async (req, res) => {
  try {
    console.log("uploadDocument chamado");
    console.log("Verificando req.file...");
    if (!req.file) {
      console.log("Nenhum ficheiro enviado.");
      return res.status(400).json({ error: "Nenhum ficheiro enviado." });
    }

    console.log("Ficheiro recebido:", req.file.originalname);
    console.log("Tipo de ficheiro:", req.file.mimetype);
    console.log("Tamanho:", req.file.size);

    const folderPath = req.body.folderPath || '';
    const filename = req.file.originalname;
    const filePath = folderPath + filename;
    
    console.log("Caminho completo do ficheiro:", filePath);

    const blob = bucket.file(filePath);
    console.log("Blob criado, iniciando upload...");

    // Upload do ficheiro
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    console.log("Ficheiro enviado com sucesso:", filePath);
    res.json({ 
      message: "Ficheiro enviado com sucesso!", 
      filename: filename,
      path: filePath 
    });

  } catch (err) {
    console.error("Erro no upload do documento:", err);
    res.status(500).json({ error: "Erro no upload: " + err.message });
  }
};

module.exports = {
  uploadPdf,
  uploadDocument,
  listPdfs,
  getPdfFormData,
  listFilesTree,
  getPdf,
  downloadPdf,
  updateDonoProcesso,
  getProcessOwners,
  deletePdf,
  listDocumentsInFolder,
};
