import ExcelJS from "exceljs";

const ExportExcel = ({ dados, totais, username, month }) => {
  const getMonthName = (monthNumber) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[monthNumber - 1] || "Mês_Inválido";
  };

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("registo de Ponto");

    const monthName = getMonthName(month);

    // Título
    ws.addRow(["REGISTO DE PONTO"]);
    ws.mergeCells("A1:E1");
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "left" };

    // Nome do colaborador
    ws.addRow([`Nome do/a Colaborador/a: ${username}`]);
    ws.mergeCells("A2:E2");

    // Mês
    ws.addRow([`Mês:  ${monthName} de ${new Date().getFullYear()}`]);
    ws.mergeCells("A3:E3");

    ws.addRow([]);

    // Cabeçalho da tabela
    const headerRow = ws.addRow(["Dia/Mês", "Hora Entrada", "Pausa", "Hora Saída", "Observação"]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    // Dados
    dados.forEach((rowData) => {
      let pausa = rowData.pausa || "";
      if (
        (rowData.horaEntrada === "Férias" || rowData.horaSaida === "Férias") ||
        (rowData.total === "Férias" || rowData.extra === "Férias")
      ) {
        pausa = "Férias";
      } else if (
        (rowData.horaEntrada === "Baixa Médica" || rowData.horaSaida === "Baixa Médica") ||
        (rowData.total === "Baixa Médica" || rowData.extra === "Baixa Médica")
      ) {
        pausa = "Baixa Médica";
      } else if (rowData.horaEntrada && rowData.horaEntrada !== "-" && rowData.horaSaida && rowData.horaSaida !== "-") {
        pausa = "13h - 13h30";
      } else {
        pausa = "-";
      }
      const row = ws.addRow([
        rowData.dia || "",
        rowData.horaEntrada || "",
        pausa,
        rowData.horaSaida || "",
        rowData.observacao || ""
      ]);
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // 4 linhas em branco
    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([]);

    // --- Assinaturas (subiram para cima dos totais) ---
    const assinaturaColStart = 4; // D
    const assinaturaColEnd = 7;   // E

    const rowAssColab = ws.addRow(["", "", "", "Assinatura do Colaborador: ________________________________", ""]);
    ws.mergeCells(
      ws.lastRow.number,
      assinaturaColStart,
      ws.lastRow.number,
      assinaturaColEnd
    );

    ws.addRow();

    const rowAssResp = ws.addRow(["", "", "", "Assinatura do Responsável: ________________________________", ""]);
    ws.mergeCells(
      ws.lastRow.number,
      assinaturaColStart,
      ws.lastRow.number,
      assinaturaColEnd
    );

    const assinaturaRows = [
      ws.getRow(rowAssColab.number),
      ws.getRow(rowAssResp.number)
    ];
    assinaturaRows.forEach((row) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber === assinaturaColStart) {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
    });

    // --- Agora sim, tabela de totais ---
    const totalHeaderRow = ws.addRow(["Resumo Mensal"]);
    totalHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.mergeCells(`A${totalHeaderRow.number}:B${totalHeaderRow.number}`);

    // Adicionar linhas de totais
    const totaisData = [
      ["Total de Horas", totais?.totalHoras || ""],
      ["Total de Horas Normais", totais?.totalNormais || ""],
      ["Total Horas Extras", totais?.totalExtras || ""],
      ["Faltas", totais?.diasFalta !== undefined ? totais.diasFalta : ""],
      ["Férias", totais?.diasFerias !== undefined ? totais.diasFerias : ""],
      ["Baixa Médica", totais?.diasBaixaMedica !== undefined ? totais.diasBaixaMedica : ""],
    ];

    totaisData.forEach((row) => {
      const newRow = ws.addRow(row); // Só as duas colunas necessárias!
      newRow.eachCell((cell, colNumber) => {
        cell.font = { bold: colNumber === 1, size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Ajustar largura das colunas
    ws.columns = [
      { width: 25 }, // Nome do total
      { width: 20 }, // Valor do total
      { width: 15 }, // Coluna vazia
      { width: 15 }, // Coluna vazia
      { width: 40 }, // Assinaturas
    ];


    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fileName = `Registo_${monthName}_${username}.xlsx`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  return (
    <button className="bg-transparent border-0 p-0 text-gold cursor-pointer hover:underline" onClick={exportToExcel}>Exportar para Excel</button>
  );
};

export default ExportExcel;
