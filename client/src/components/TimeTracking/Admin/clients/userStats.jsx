import React from 'react';
import ExportExcel from '../../ExportExcel';

const AnnualStats = ({
  totaisAnuais,
  selectedMonth,
  selectedYear,
  totais,
  feriasPendentes,
  userName,
  dados,
  handleApproveVacation,
  handleRejectVacation
}) => {
  if (!(totaisAnuais || (selectedMonth && totais))) return null;

  const stats = [
    { label: "Horas Normais", value: selectedMonth ? (totais?.totalHoras || "0h 0m") : (totaisAnuais?.totalHoras || "0h 0m") },
    { label: "Horas Extra", value: selectedMonth ? (totais?.totalExtras || "0h 0m") : (totaisAnuais?.totalExtras || "0h 0m") },
    { label: "Faltas", value: selectedMonth ? (totais?.diasFalta || 0) : (totaisAnuais?.diasFalta || 0) },
    { label: "Férias", value: selectedMonth ? (totais?.diasFerias || 0) : (totaisAnuais?.diasFerias || 0) },
    { label: "Baixas Médicas", value: selectedMonth ? (totais?.diasBaixaMedica || 0) : (totaisAnuais?.diasBaixaMedica || 0) },
  ];

  // Formatar a data para exibição mais legível
  const formatDate = (dateStr) => {
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 2) {
        return `${parts[0]}/${parts[1]}`;
      } else if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden lg:sticky lg:top-6">
      <div className="px-[18px] py-[14px] border-b border-gray-100">
        <h2 className="text-[13px] font-semibold text-gray-900">{selectedMonth ? "Totais do Mês" : `Totais ${selectedYear}`}</h2>
      </div>

      <dl className="px-[18px] py-4 flex flex-col gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <dt className="text-[11px] text-gray-500">{stat.label}</dt>
            <dd className="text-[13px] text-gray-900 font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {feriasPendentes.length > 0 && (
        <div className="px-[18px] py-4 border-t border-gray-100">
          <h3 className="text-[11px] uppercase tracking-wider text-[#C8932F] font-semibold mb-3">Férias Pendentes</h3>
          <ul className="flex flex-col gap-2">
            {feriasPendentes.map((feria, index) => (
              <li key={index} className="flex items-center justify-between gap-2 p-2.5 bg-[#FAF3E6] rounded-lg">
                <span className="text-[12.5px] font-semibold text-gray-700">{formatDate(feria.date)}</span>
                <div className="flex gap-1.5">
                  <button
                    className="bg-green-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-green-700"
                    onClick={() => handleApproveVacation(feria.date)}
                  >
                    Aprovar
                  </button>
                  <button
                    className="bg-red-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-red-700"
                    onClick={() => handleRejectVacation(feria.date)}
                  >
                    Negar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-[18px] py-4 border-t border-gray-100">
        <ExportExcel month={selectedMonth} username={userName} dados={dados} totais={totais} />
      </div>
    </div>
  );
};

export default AnnualStats;