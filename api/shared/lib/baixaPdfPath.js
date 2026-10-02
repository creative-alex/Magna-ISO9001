// Destino no Storage do PDF de justificação de uma baixa médica do livro de ponto:
// BaixasMedicas/{uid}/{ano}/{ficheiro}  -  mesma organização por colaborador usada no
// cadastro (Cadastro/{uid}/...) e nos recibos (RecibosVencimento/{uid}/{ano}/...).
// O upload (POST /files/upload-document) ainda não sabe o uid real do colaborador,
// por isso o ficheiro chega primeiro a BaixasMedicas/{ficheiro} e é movido para aqui
// em createMedicalLeave (vacationController.js), depois de resolveTargetUid.
function baixaPdfPathFor(uid, year, currentPath) {
  const nome = currentPath.split("/").pop();
  return `BaixasMedicas/${uid}/${year}/${nome}`;
}

// Só ficheiros acabados de enviar (soltos na raiz de BaixasMedicas/) são movidos -
// nunca um caminho arbitrário vindo do cliente (ex.: o recibo de outro colaborador).
function isPdfBaixaSolto(path) {
  return typeof path === "string" && /^BaixasMedicas\/[^/]+$/.test(path);
}

module.exports = { baixaPdfPathFor, isPdfBaixaSolto };
