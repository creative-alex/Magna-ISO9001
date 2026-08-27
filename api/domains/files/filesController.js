// controllers/pdfController.js
const admin = require("firebase-admin");
const { PDFDocument } = require('pdf-lib');

// Importar configuração do Firebase
require("../db/firebase");

// Configuração do Firebase Storage
const bucket = admin.storage().bucket();


const listPdfs = async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const pdfFiles = files
      .filter(f => f.name.endsWith(".pdf"))
      .map(f => f.name);
    res.json(pdfFiles);
  } catch (err) {
    console.error("Erro em listPdfs:", err);
    res.status(500).send("Erro ao listar PDFs: " + err.message);
  }
};

const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Nenhum ficheiro enviado.");
    }

    const folders = req.body.folders ? JSON.parse(req.body.folders) : [];
    const filename = req.body.filename || Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = [...folders, filename].join("/");

    const blob = bucket.file(filePath);

    // Upload direto usando save()
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      }
    });

    // Se é um novo processo (tem donoProcesso no body), criar documento no Firestore
    if (req.body.donoProcesso && folders.length > 0) {
      const processName = folders[0]; // O nome da pasta é o nome do processo
      
      try {
        const db = admin.firestore();
        
        const processosRef = db.collection('processos');
        
        const documentData = {
          donoProcesso: req.body.donoProcesso,
          objetivoProcesso: req.body.objetivoProcesso || '',
          servicos_entrada: req.body.servicos_entrada || '',
          servico_saida: req.body.servico_saida || '',
          indicadores_r1: req.body.indicadores_r1 || '',
          indicadores_r2: req.body.indicadores_r2 || '',
          indicadores_r3: req.body.indicadores_r3 || '',
          atividades: req.body.atividades ? JSON.parse(req.body.atividades) : [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        
        await processosRef.doc(processName).set(documentData);
        
        
      } catch (firestoreError) {
        // Não falha o upload por causa do Firestore, apenas logga o erro
      }
    } else {
    }

    res.status(200).send("PDF guardado com sucesso!");
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).send("Erro ao guardar PDF: " + err.message);
  }
};

const getPdfFormData = async (req, res) => {
  try {
    // Lê do body (POST), não do query
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).send("Ficheiro não especificado.");
    }

    // Decodifica o filename caso tenha caracteres especiais
    const decodedFilename = decodeURIComponent(filename);

    const file = bucket.file(decodedFilename); // Usa o caminho completo decodificado
    const [buffer] = await file.download();

    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();

    const fields = form.getFields();
    const data = {};
    fields.forEach(field => {
      data[field.getName()] = field.getText ? field.getText() : "";
    });

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
    console.log("Path recebido (raw):", path);
    if (!path) {
      console.log("Path não fornecido");
      return res.status(400).send("Path não fornecido");
    }

    // Decodifica o path caso tenha caracteres especiais
    const decodedPath = decodeURIComponent(path);
    console.log("Path decodificado:", decodedPath);

    console.log("Verificando se o arquivo existe:", decodedPath);
    const file = bucket.file(decodedPath);
    const [exists] = await file.exists();
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedPath);
      return res.status(404).send("Arquivo não encontrado");
    }

    console.log("Baixando arquivo...");
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    console.log("Arquivo baixado com sucesso:", decodedPath);
    console.log("Tipo de conteúdo:", metadata.contentType);

    // Define o tipo de conteúdo baseado no metadata
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(decodedPath.split('/').pop())}"`);
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
    console.log("Path recebido para download (raw):", path);
    if (!path) {
      console.log("Path não fornecido");
      return res.status(400).send("Path não fornecido");
    }

    // Decodifica o path caso tenha caracteres especiais
    const decodedPath = decodeURIComponent(path);
    console.log("Path decodificado:", decodedPath);

    const file = bucket.file(decodedPath);
    console.log("Verificando se o arquivo existe:", decodedPath);
    const [exists] = await file.exists();
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedPath);
      return res.status(404).send("Arquivo não encontrado");
    }

    console.log("Fazendo download do arquivo:", decodedPath);
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    console.log("Download concluído, tamanho do buffer:", buffer.length);
    console.log("Metadata do arquivo:", metadata.contentType);
    
    // Define o nome do arquivo para download
    const filename = decodedPath.split('/').pop();
    
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
    const updateData = {
      donoProcesso: donoProcesso,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Se histórico foi enviado, incluir na atualização
    if (req.body.history && Array.isArray(req.body.history)) {
      updateData.history = req.body.history;
    }

    await docRef.update(updateData);

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

// Nova função para salvar histórico
const saveProcessHistory = async (req, res) => {
  try {
    console.log("saveProcessHistory chamado");
    const { processId, history } = req.body;
    
    if (!processId || !Array.isArray(history)) {
      return res.status(400).json({ error: "processId e history (array) são obrigatórios" });
    }

    console.log("Salvando histórico para processId:", processId, "entries:", history.length);

    const db = admin.firestore();
    const processosRef = db.collection('processos');
    const docRef = processosRef.doc(processId);
    
    // Verifica se documento existe
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      // Se não existe, cria novo documento apenas com histórico
      await docRef.set({
        history: history,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Se existe, atualiza apenas o histórico
      await docRef.update({
        history: history,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log("Histórico salvo com sucesso");
    res.json({ success: true, message: "Histórico salvo com sucesso" });

  } catch (error) {
    console.error("Erro ao salvar histórico:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

// Nova função para buscar dados completos do processo (incluindo histórico)
const getProcessData = async (req, res) => {
  try {
    console.log("getProcessData chamado");
    const { processId } = req.body;
    
    if (!processId) {
      return res.status(400).json({ error: "processId é obrigatório" });
    }

    const db = admin.firestore();
    const processosRef = db.collection('processos');
    const docRef = processosRef.doc(processId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      console.log("Processo não encontrado:", processId);
      return res.json({ exists: false, data: null });
    }

    const data = docSnapshot.data();
    console.log("Dados do processo carregados:", processId);
    res.json({ exists: true, data: data });

  } catch (error) {
    console.error("Erro ao buscar dados do processo:", error);
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
    
    // Decodifica o filename caso tenha caracteres especiais
    const decodedFilename = decodeURIComponent(filename);
    console.log("Tentando eliminar ficheiro:", decodedFilename);
    
    // Verifica se o arquivo existe
    const file = bucket.file(decodedFilename);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedFilename);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Elimina o arquivo
    await file.delete();
    console.log("Arquivo eliminado com sucesso:", decodedFilename);
    
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
    const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
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

// Nova função para apagar arquivos via DELETE com parâmetro na URL
const deleteFile = async (req, res) => {
  try {
    console.log("deleteFile chamado");
    const filePath = req.params.filePath;
    
    if (!filePath) {
      console.log("FilePath não fornecido");
      return res.status(400).json({ error: "Caminho do arquivo é obrigatório" });
    }
    
    // Decodifica o caminho do arquivo caso tenha caracteres especiais
    const decodedFilePath = decodeURIComponent(filePath);
    console.log("Tentando eliminar ficheiro:", decodedFilePath);
    
    // Verifica se o arquivo existe
    const file = bucket.file(decodedFilePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedFilePath);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Elimina o arquivo
    await file.delete();
    console.log("Arquivo eliminado com sucesso:", decodedFilePath);
    
    res.json({ success: true, message: "Ficheiro eliminado com sucesso" });
    
  } catch (error) {
    console.error("Erro ao eliminar ficheiro:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

// Nova função para download via GET com parâmetro na URL
const downloadFile = async (req, res) => {
  try {
    console.log("downloadFile chamado");
    const filePath = req.params.filePath;
    
    if (!filePath) {
      console.log("FilePath não fornecido");
      return res.status(400).send("Caminho do arquivo é obrigatório");
    }
    
    // Decodifica o caminho do arquivo caso tenha caracteres especiais
    const decodedFilePath = decodeURIComponent(filePath);
    console.log("Fazendo download do arquivo:", decodedFilePath);
    
    const file = bucket.file(decodedFilePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedFilePath);
      return res.status(404).send("Arquivo não encontrado");
    }
    
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    
    // Define o nome do arquivo para download
    const filename = decodedFilePath.split('/').pop();
    
    // Define o tipo de conteúdo baseado no metadata ou na extensão
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error("Erro ao fazer download do arquivo:", error);
    res.status(500).send("Erro ao fazer download do arquivo: " + error.message);
  }
};

// Nova função para preview via GET com parâmetro na URL
const previewFile = async (req, res) => {
  try {
    console.log("previewFile chamado");
    const filePath = req.params.filePath;
    
    if (!filePath) {
      console.log("FilePath não fornecido");
      return res.status(400).send("Caminho do arquivo é obrigatório");
    }
    
    // Decodifica o caminho do arquivo caso tenha caracteres especiais
    const decodedFilePath = decodeURIComponent(filePath);
    console.log("Fazendo preview do arquivo:", decodedFilePath);
    
    const file = bucket.file(decodedFilePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("Arquivo não encontrado:", decodedFilePath);
      return res.status(404).send("Arquivo não encontrado");
    }
    
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    
    // Define o tipo de conteúdo baseado no metadata ou na extensão
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline'); // Para preview em vez de download
    res.send(buffer);
    
  } catch (error) {
    console.error("Erro ao fazer preview do arquivo:", error);
    res.status(500).send("Erro ao fazer preview do arquivo: " + error.message);
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
  downloadFile,
  previewFile,
  updateDonoProcesso,
  getProcessOwners,
  saveProcessHistory,
  getProcessData,
  deletePdf,
  deleteFile,
  listDocumentsInFolder,
};