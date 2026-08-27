import React from 'react';

const TableRow = ({ 
  item, 
  index, 
  month, 
  onContextMenu,
  showTooltip, 
  hideTooltip, 
  openOvertimeManager 
}) => {
  // Função para extrair apenas a hora no formato HH:MM
  const extractTime = (timeString) => {
    if (!timeString || timeString === "-") return "-";
    // Se tem espaço, é formato YYYY-MM-DD HH:MM, pega a parte após o espaço
    if (timeString.includes(' ')) {
      return timeString.split(' ')[1];
    }
    // Se já é só HH:MM, retorna como está
    return timeString;
  };

  // Calcular a data atual para verificar se é fim de semana
  const dataAtual = new Date(new Date().getFullYear(), month - 1, index + 1);
  const diaSemana = dataAtual.getDay();
  const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
  
  const isLessThanEightHours = item.total !== "-" && parseInt(item.total.split("h")[0]) < 8 && !isFimDeSemana;
  const isFeriasPendente = item.feriasPendente;
  const isBaixaPendente = item.baixaPendente;

  // Debug log
  if (item.manualOvertime) {
    console.log('TableRow - Dia com manualOvertime:', item.dia, item);
  }

  // Definir classes Tailwind baseado no status
  let rowClass = "";
  if (isFeriasPendente) {
    rowClass = "bg-warning-light";
  } else if (isBaixaPendente) {
    rowClass = "bg-danger-light";
  } else if (isLessThanEightHours) {
    rowClass = "text-danger";
  }

  return (
    <tr
      onContextMenu={(e) => onContextMenu(e, index)}
      className={rowClass}
    >
      <td className="px-4 py-3 text-left border-b border-gray-200">
        {item.dia}
        {item.manualOvertime && (
          <span
            className="text-gold font-bold ml-[5px] cursor-pointer"
            onMouseEnter={(e) => showTooltip(e, item.manualOvertime, item.manualOvertimeDescription)}
            onMouseLeave={hideTooltip}
            onClick={(e) => {
              e.stopPropagation();
              openOvertimeManager(item.manualOvertimeEntries, item.diaCompleto);
            }}
          >
            *
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-left border-b border-gray-200">{extractTime(item.horaEntrada)}</td>
      <td className="px-4 py-3 text-left border-b border-gray-200">{extractTime(item.horaSaida)}</td>
      <td className="px-4 py-3 text-left border-b border-gray-200">{item.total}</td>
      <td className={`px-4 py-3 text-left border-b border-gray-200 ${item.extra !== '-' && item.extra !== '0h 0m' ? 'text-success' : ''}`}>
        {item.extra !== '-' && item.extra !== '0h 0m' ? item.extra : '-'}
      </td>
    </tr>
  );
};

export default TableRow;
