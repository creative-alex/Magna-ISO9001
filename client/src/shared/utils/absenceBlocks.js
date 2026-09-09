// Espelha api/shared/lib/absenceBlocks.js  -  bloco de ausência (cedência temporária,
// baixa médica/licença do Cadastro) com dataInicio/dataFim em formato ISO (YYYY-MM-DD).

export function isBlocoAtivoEm(bloco, dataIso) {
  if (!bloco?.dataInicio || bloco.dataInicio > dataIso) return false;
  return !bloco.dataFim || bloco.dataFim >= dataIso;
}

// "baixasMedicas" guarda tanto baixas médicas como as várias licenças (parental, luto, ...)
// no mesmo bloco, distinguidas pelo campo "tipo"  -  os valores de licença começam todos
// por "Licença", por isso chega este prefixo (ver TIPO_BAIXA_OPTIONS em formOptions.js).
export function labelBaixaOuLicenca(tipo) {
  if (!tipo) return "Baixa médica";
  return tipo.startsWith("Licença") ? "Licença" : "Baixa médica";
}

// Situação contratual diferente de "Ativo" exclui o dia, exceto "Cessado" com data de fim
// de contrato conhecida  -  nesse caso só os dias depois dessa data ficam de fora (antes
// dela o colaborador estava mesmo ativo). Ver isDiaForaDeAtivo em reportsController.js.
export function isDiaForaDeAtivo(situacaoContratual, dataFimContrato, dataIso) {
  if (!situacaoContratual || situacaoContratual === "Ativo") return false;
  if (situacaoContratual === "Cessado" && dataFimContrato) return dataIso > dataFimContrato;
  return true;
}
