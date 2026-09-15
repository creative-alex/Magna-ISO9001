import React, { useState } from 'react';
import { FaFilePdf } from 'react-icons/fa6';
import { apiFetch } from '../../../../../shared/utils/apiFetch';
import ExportExcel from '../../ExportExcel';

const AnnualStats = ({
  totaisAnuais,
  selectedMonth,
  selectedYear,
  totais,
  feriasPendentes,
  pendingTimeEdits,
  baixasPendentes,
  userName,
  dados,
  handleApproveVacation,
  handleRejectVacation,
  handleApproveTimeEdit,
  handleRejectTimeEdit,
  handleApproveBaixa,
  handleRejectBaixa,
  fechoMensal,
  handleConfirmFechoMensal
}) => {
  const [viewingPdf, setViewingPdf] = useState(false);

  const handleViewBaixaPdf = async (pdfPath) => {
    if (!pdfPath || viewingPdf) return;
    setViewingPdf(true);
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(pdfPath) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        alert("Falha ao abrir o documento de justificação.");
      }
    } catch (err) {
      console.error("Erro ao abrir documento de justificação:", err);
      alert("Falha ao abrir o documento de justificação.");
    } finally {
      setViewingPdf(false);
    }
  };
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

      {baixasPendentes?.length > 0 && (
        <div className="px-[18px] py-4 border-t border-gray-100">
          <h3 className="text-[11px] uppercase tracking-wider text-[#C8932F] font-semibold mb-3">Baixas Médicas Pendentes</h3>
          <ul className="flex flex-col gap-2">
            {baixasPendentes.map((pedido, index) => (
              <li key={pedido.requestId || index} className="flex flex-col gap-1.5 p-2.5 bg-[#FAF3E6] rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-gray-700">
                    {formatDate(pedido.dates[0])}
                    {pedido.dates.length > 1 && <> a {formatDate(pedido.dates[pedido.dates.length - 1])}</>}
                    {pedido.totalDiasUteis ? ` (${pedido.totalDiasUteis} dia${pedido.totalDiasUteis > 1 ? 's' : ''} úteis)` : ''}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      className="bg-green-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-green-700"
                      onClick={() => handleApproveBaixa(pedido)}
                    >
                      Aprovar
                    </button>
                    <button
                      className="bg-red-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-red-700"
                      onClick={() => handleRejectBaixa(pedido)}
                    >
                      Negar
                    </button>
                  </div>
                </div>
                {pedido.pdfPath && (
                  <button
                    className="self-start flex items-center gap-1.5 text-[11.5px] text-[#8a6a22] bg-transparent border-0 p-0 cursor-pointer hover:underline"
                    onClick={() => handleViewBaixaPdf(pedido.pdfPath)}
                  >
                    <FaFilePdf size={11} /> Ver documento de justificação
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingTimeEdits?.length > 0 && (
        <div className="px-[18px] py-4 border-t border-gray-100">
          <h3 className="text-[11px] uppercase tracking-wider text-[#C8932F] font-semibold mb-3">Alterações de Horas Pendentes</h3>
          <ul className="flex flex-col gap-2">
            {pendingTimeEdits.map((ajuste, index) => (
              <li key={index} className="flex flex-col gap-1.5 p-2.5 bg-[#FAF3E6] rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-gray-700">{formatDate(ajuste.date)}</span>
                  <div className="flex gap-1.5">
                    <button
                      className="bg-green-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-green-700"
                      onClick={() => handleApproveTimeEdit(ajuste.date)}
                    >
                      Aprovar
                    </button>
                    <button
                      className="bg-red-600 text-white border-0 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-red-700"
                      onClick={() => handleRejectTimeEdit(ajuste.date)}
                    >
                      Negar
                    </button>
                  </div>
                </div>
                <span className="text-[11.5px] text-gray-600">
                  {ajuste.horaEntrada && <>Entrada: <strong>{ajuste.horaEntrada}</strong>{ajuste.horaSaida ? "  •  " : ""}</>}
                  {ajuste.horaSaida && <>Saída: <strong>{ajuste.horaSaida}</strong></>}
                </span>
                <span className="text-[11.5px] text-gray-500 italic">{ajuste.justificativa}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedMonth && fechoMensal && (
        <div className="px-[18px] py-4 border-t border-gray-100">
          <h3 className="text-[11px] uppercase tracking-wider text-[#C8932F] font-semibold mb-3">Fecho Mensal</h3>
          {fechoMensal.confirmed ? (
            <div className="p-2.5 bg-green-50 text-green-800 rounded-lg text-[12px]">
              Confirmado{fechoMensal.confirmedAt ? ` em ${new Date(fechoMensal.confirmedAt).toLocaleString('pt-PT')}` : ''}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className={`p-2.5 rounded-lg text-[12px] ${fechoMensal.flagged ? 'bg-red-50 text-red-700' : 'bg-[#FAF3E6] text-gray-700'}`}>
                {fechoMensal.flagged ? 'Não confirmado - prazo expirado' : 'Ainda não confirmado pelo colaborador'}
              </div>
              <button
                className="bg-[#C8932F] text-white border-0 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors duration-200 hover:bg-[#A47422] self-start"
                onClick={handleConfirmFechoMensal}
              >
                Confirmar em nome do colaborador
              </button>
            </div>
          )}
        </div>
      )}

      <div className="px-[18px] py-4 border-t border-gray-100">
        <ExportExcel month={selectedMonth} username={userName} dados={dados} totais={totais} />
      </div>
    </div>
  );
};

export default AnnualStats;