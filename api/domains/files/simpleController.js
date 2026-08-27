const admin = require("firebase-admin");

// Garantir que Firebase está inicializado
require("../../shared/db/firebase");

// CONTROLLER SIMPLES - SÓ PARA CRIAR REGISTROS NA BD
const createProcessRecord = async (req, res) => {
  try {
    console.log("=== CRIAR REGISTRO BD ===");
    console.log("Dados recebidos:", req.body);
    
    // Extrair apenas os dados necessários
    const { processName, donoProcesso } = req.body;
    
    // Validação simples
    if (!processName) {
      console.log("❌ processName em falta");
      return res.status(400).json({ error: "processName é obrigatório" });
    }
    
    if (!donoProcesso) {
      console.log("❌ donoProcesso em falta");
      return res.status(400).json({ error: "donoProcesso é obrigatório" });
    }
    
    console.log("✅ Dados válidos!");
    console.log("- ID do documento:", processName);
    console.log("- Dono do processo:", donoProcesso);
    
    // Conectar ao Firestore
    const db = admin.firestore();
    
    // Preparar dados - APENAS o dono do processo!
    const documentData = {
      donoProcesso: donoProcesso
    };
    
    console.log("📝 Salvando documento...");
    
    // CRIAR O DOCUMENTO na coleção "processos"
    await db.collection('processos').doc(processName).set(documentData);
    
    console.log("✅ DOCUMENTO SALVO COM SUCESSO!");
    
    res.json({
      success: true,
      message: "Registro criado com sucesso",
      documentId: processName,
      data: documentData
    });
    
  } catch (error) {
    console.error("❌ ERRO:", error);
    
    res.status(500).json({
      error: "Erro ao criar registro",
      details: error.message
    });
  }
};

// CONTROLLER SIMPLES - SÓ PARA GUARDAR PDF
const savePdfOnly = async (req, res) => {
  try {
    console.log("=== GUARDAR PDF ===");
    
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }
    
    // Obter dados do formulário
    const folders = req.body.folders ? JSON.parse(req.body.folders) : [];
    const filename = req.body.filename || Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = [...folders, filename].join("/");
    
    // Conectar ao Firebase Storage
    const bucket = admin.storage().bucket();
    const blob = bucket.file(filePath);
    
    // Guardar o PDF
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      }
    });
    
    console.log("✅ PDF GUARDADO:", filePath);
    
    res.json({
      success: true,
      message: "PDF guardado com sucesso",
      filePath: filePath
    });
    
  } catch (error) {
    console.error("❌ ERRO AO GUARDAR PDF:", error);
    
    res.status(500).json({
      error: "Erro ao guardar PDF",
      details: error.message
    });
  }
};

module.exports = {
  createProcessRecord,
  savePdfOnly
};