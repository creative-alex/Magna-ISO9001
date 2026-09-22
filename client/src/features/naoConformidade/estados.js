// Mesmas 3 opções de gravidade usadas no registo (RegistoNaoConformidade.jsx) e na
// classificação da catalogação (NaoConformidadeDetail.jsx) - fonte única, para não
// divergirem.
export const GRAVIDADES = ["Pouco grave", "Grave", "Muito grave"];

// Espelha exatamente os estados definidos no backend (naoConformidadeController.js) -
// nunca inventar estados adicionais aqui.
export const NC_ESTADOS = {
  registada: { label: "Registada", color: "#6b7280" },
  para_tratamento: { label: "Para tratamento", color: "#f59e0b" },
  tratada: { label: "Tratada", color: "#3b82f6" },
  fechada: { label: "Fechada", color: "#22c55e" },
};

export const ACAO_ESTADOS = {
  por_implementar: { label: "Por implementar", color: "#ef4444" },
  implementada: { label: "Implementada", color: "#f59e0b" },
  eficaz: { label: "Eficaz", color: "#22c55e" },
};

export function ncEstadoLabel(estado) {
  return NC_ESTADOS[estado]?.label || estado;
}

export function acaoEstadoLabel(estado) {
  return ACAO_ESTADOS[estado]?.label || estado;
}
