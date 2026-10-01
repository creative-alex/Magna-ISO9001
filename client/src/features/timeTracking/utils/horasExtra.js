// Estados de uma hora extra manual - espelho de ESTADOS_HORA_EXTRA em
// api/domains/timeTracking/overtimeApprovalController.js. Registos antigos (antes de
// existir aprovação) vêm do backend já com estado "aprovada".
export const ESTADOS_HORA_EXTRA = { PENDENTE: 'pendente', APROVADA: 'aprovada', REJEITADA: 'rejeitada' };

export const LABEL_ESTADO_HORA_EXTRA = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

export const estadoHoraExtra = (entry) => entry?.estado || ESTADOS_HORA_EXTRA.APROVADA;

// Só as aprovadas contam para totais (mês/ano, Excel) - igual ao backend.
export const minutosHorasExtraAprovadas = (entries = []) =>
  entries
    .filter((e) => estadoHoraExtra(e) === ESTADOS_HORA_EXTRA.APROVADA)
    .reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
