import React, { useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "react-toastify";
import { FaFileExcel, FaXmark } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";

const GOLD = "#C8932F";
const RED = "#DC2626";
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8932F" } };
const THIN_BORDER = {
  top: { style: "thin" }, left: { style: "thin" },
  bottom: { style: "thin" }, right: { style: "thin" },
};

// Nome de folha do Excel: máx. 31 carateres, sem os símbolos que o Excel proíbe
// (\ / * ? : [ ]).
function safeSheetName(name) {
  const cleaned = (name || "Entidade").replace(/[\\/*?:[\]]/g, "");
  return cleaned.slice(0, 31) || "Entidade";
}

// Botão de exportação do processamento de salários (ver ProcessamentoSalarios.jsx) - gera
// um Excel com uma folha por entidade, um mês de cada vez, só com colaboradores cujo fecho
// mensal desse mês já está confirmado (ver GET /salario/export/:mes em salarioController.js,
// que já usa o summarySnapshot congelado na confirmação em vez de recalcular ao vivo).
//
// "entidade" (opcional, nome tal como devolvido por getColaboradores) limita o export a
// essa entidade - usado pelo botão junto ao nome de cada entidade em
// ColaboradoresGroupedList (ver renderGroupExtra em ProcessamentoSalarios.jsx). Nesse caso
// o backend garante que a entidade vem sempre na resposta, mesmo sem nenhum colaborador
// confirmado ainda, para se poder pré-visualizar/testar o botão antes de haver dados reais.
// "compact" troca o botão com texto por um ícone pequeno, para caber ao lado do nome da
// entidade sem alargar a linha do cabeçalho do grupo.
// "closed" (opcional, boolean) pinta o botão a vermelho quando ainda há colaboradores por
// fechar o mês corrente, ou a dourado quando já fecharam todos - ver cálculo em
// ProcessamentoSalarios.jsx a partir de GET /fecho-mensal/all-status. undefined/null
// (ainda a carregar, ou sem colaboradores para essa entidade) mantém a cor dourada default.
export default function ExportFechoMensalButton({ entidade, compact = false, closed }) {
  const accentColor = closed === false ? RED : GOLD;
  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const mes = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    setLoading(true);
    try {
      const url = entidade
        ? `/salario/export/${mes}?entidade=${encodeURIComponent(entidade)}`
        : `/salario/export/${mes}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Erro ao gerar o ficheiro");
        return;
      }
      if (!data.entidades || data.entidades.length === 0) {
        toast.info("Ainda nenhum colaborador confirmou o fecho deste mês");
        return;
      }

      const wb = new ExcelJS.Workbook();
      const usedNames = new Set();

      data.entidades.forEach((ent) => {
        let sheetName = safeSheetName(ent.nome);
        // Duas entidades diferentes podem ter o mesmo nome truncado - garantir nomes
        // de folha únicos, exigido pelo Excel.
        let suffix = 2;
        while (usedNames.has(sheetName)) {
          sheetName = `${safeSheetName(ent.nome).slice(0, 28)} (${suffix})`;
          suffix++;
        }
        usedNames.add(sheetName);

        const ws = wb.addWorksheet(sheetName);

        ws.addRow([`${String(selectedMonth).padStart(2, "0")} ${selectedYear}/ ${data.diasUteis} dias úteis`]);
        ws.getRow(1).font = { bold: true, size: 12 };

        ws.addRow([]);

        const entRow = ws.addRow([ent.nif ? `${ent.nome} | NIF ${ent.nif}` : ent.nome]);
        ws.mergeCells(`A${entRow.number}:F${entRow.number}`);
        entRow.eachCell((cell) => {
          cell.font = { bold: true, size: 13 };
          cell.alignment = { horizontal: "center" };
        });

        ws.addRow([]);

        const headerRow = ws.addRow(["Nome", "Dias Trabalho", "Dias Férias", "Baixa Médica", "Licença", "Deslocações"]);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = HEADER_FILL;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = THIN_BORDER;
        });

        ent.colaboradores.forEach((col) => {
          const row = ws.addRow([
            col.nome,
            col.diasTrabalhados || "-",
            col.diasFerias || "-",
            col.diasBaixaMedica || "-",
            col.diasLicenca || "-",
            col.deslocacoesAtivas ? `${col.deslocacoesKm} km` : "-",
          ]);
          row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: colNumber === 1 ? "left" : "center", vertical: "middle" };
            cell.border = THIN_BORDER;
          });
        });

        ws.columns = [
          { width: 32 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 16 },
        ];
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileSuffix = entidade ? `${safeSheetName(entidade)}_${mes}` : mes;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Processamento_Salarios_${fileSuffix}.xlsx`;
      link.click();

      setShowModal(false);
    } catch (err) {
      console.error("Erro ao exportar fecho mensal:", err);
      toast.error("Erro ao gerar o ficheiro");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (e) => {
    if (e) e.stopPropagation(); // não desmarcar/colapsar o grupo da entidade ao clicar
    setShowModal(true);
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={openModal}
          title={
            (entidade ? `Exportar Excel de ${entidade}` : "Exportar Excel")
            + (closed === false ? " - ainda há colaboradores por fechar o mês" : closed === true ? " - mês já fechado por todos" : "")
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border shrink-0 ${
            closed === false
              ? "text-red-600 border-red-600 hover:bg-red-50"
              : "text-[#C8932F] border-[#C8932F] hover:bg-[#C8932F]/10"
          }`}
        >
          <FaFileExcel size={12} />
          Exportar
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors"
          style={{ borderColor: accentColor, color: accentColor, background: "#fff" }}
        >
          <FaFileExcel style={{ fontSize: 13 }} />
          Exportar todos
        </button>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
          onClick={(e) => { e.stopPropagation(); if (!loading) setShowModal(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-[380px] w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed"
            >
              <FaXmark size={16} />
            </button>

            <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
              <span className="w-10 h-10 rounded-xl bg-[#C8932F]/10 text-[#C8932F] flex items-center justify-center shrink-0">
                <FaFileExcel size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Exportar Excel</h2>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {entidade ? entidade : "Só colaboradores com o fecho mensal confirmado"}
                </p>
              </div>
            </div>

            <div className="px-6 pt-5 pb-6">
              <div className="flex gap-3 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Mês</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                  >
                    {MONTH_NAMES.map((label, index) => (
                      <option key={label} value={index + 1}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ano</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={loading}
                className="w-full py-2.5 px-4 border-none rounded-full bg-[#C8932F] text-white text-sm font-semibold cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading ? "A gerar..." : "Gerar Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
