// Blocos de ausência com data de início/fim (cedência temporária, baixa médica/licença -
// ver users/{uid}/cedencias e users/{uid}/baixasMedicas em cadastroController.js). Cada
// bloco guarda dataInicio/dataFim em formato ISO (YYYY-MM-DD, de um <input type="date">);
// dataFim pode não existir (bloco ainda a decorrer).
function isBlocoAtivoEm(bloco, dateIso) {
  if (!bloco?.dataInicio || bloco.dataInicio > dateIso) return false;
  return !bloco.dataFim || bloco.dataFim >= dateIso;
}

// "baixasMedicas" guarda tanto baixas médicas como as várias licenças (parental, luto, ...)
// no mesmo bloco, distinguidas pelo campo "tipo" (ver TIPO_BAIXA_OPTIONS no Cadastro.jsx) -
// os valores de licença começam todos por "Licença", por isso chega este prefixo.
function labelBaixaOuLicenca(tipo) {
  if (!tipo) return "Baixa médica";
  return tipo.startsWith("Licença") ? "Licença" : "Baixa médica";
}

module.exports = { isBlocoAtivoEm, labelBaixaOuLicenca };
