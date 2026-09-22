const { PDFDocument } = require("pdf-lib");

const MAX_ANEXO_SIZE = 4 * 1024 * 1024; // 4MB, mesmo limite de APP_CONSTANTS.MAX_UPLOAD_SIZE no frontend

// Confirma que o buffer é mesmo um PDF válido (faz parse real com pdf-lib), não só que o
// nome/mimetype dizem ".pdf" - um ficheiro renomeado para .pdf falha aqui. Devolve null
// quando válido, ou uma mensagem de erro pronta a devolver ao cliente.
async function validatePdfBuffer(buffer) {
  if (!buffer || !buffer.length) return "Ficheiro vazio.";
  if (buffer.length > MAX_ANEXO_SIZE) return "Ficheiro excede o limite de 4MB.";
  try {
    await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    return "O ficheiro não é um PDF válido.";
  }
  return null;
}

module.exports = { validatePdfBuffer, MAX_ANEXO_SIZE };
