import { createBasePdf, wrapText, pageSize, xStart, yStart } from './pdfBase';
import { drawTableLines, drawHeaders, drawObsTable, getObsRows, colWidths, obsColWidth, obsRowHeight, spaceBetweenTables, drawTemplate2Table, colWidthTemplate2 } from './pdfTables';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Função principal para gerar PDF editável
export async function generateEditablePdf({
  templateType = 1,
  data,
  headers,
  dataObs,
  headersObs,
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida
}) {
  if (templateType === 2) {
    return await generateEditablePdfTemplate2({
      atividades,
      donoProcesso,
      objetivoProcesso,
      indicadores,
      servicosEntrada,
      servicoSaida,
    });
  } else {
    return await generateEditablePdfTemplate1(data, headers, dataObs, headersObs);
  }
}

// Renomeie a função antiga para Template1
export async function generateEditablePdfTemplate1(data, headers, dataObs, headersObs) {
  const { pdfDoc, page, font } = await createBasePdf();
  const form = pdfDoc.getForm();

  // Use obsRows dinâmico
  const obsRows = getObsRows(dataObs);
  const obsTableHeightReal = drawObsTable(page, font, dataObs);

  let yObs = yStart;
  const fontSize = 8;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const safeDataObs = Array.from({ length: obsRows }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );
  const rowHeightsObs = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16);
  });
  for (let row = 0; row < obsRows; row++) {
    const fieldName = `table1_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(dataObs && dataObs[row] ? dataObs[row][0] : "");
    textField.addToPage(page, {
      x: xStart + 2,
      y: yObs - rowHeightsObs[row] + 2,
      width: obsColWidth[0] - 4,
      height: rowHeightsObs[row] - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(1, 1, 1),
      border: undefined,
    });
    textField.defaultUpdateAppearances(font);
    textField.setFontSize(8);
    yObs -= rowHeightsObs[row];
  }

  // Gere dinamicamente os rowHeights para a tabela principal
  const rowHeights = Array(data.length + 1).fill(50); // +1 para o header

  // Desenha tabela principal
  drawTableLines(page, obsTableHeightReal - (obsRowHeight * obsRows), undefined, rowHeights);
  drawHeaders(page, headers, font, obsTableHeightReal - (obsRowHeight * obsRows), undefined, rowHeights);

  let yPos = yStart - obsTableHeightReal - spaceBetweenTables - rowHeights[0];
  for (let row = 0; row < data.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < 5; col++) {
      const fieldName = `table2_r${row + 2}_c${col + 1}`;
      const textField = form.createTextField(fieldName);
      textField.enableMultiline();
      textField.setText(data[row][col]);
      textField.addToPage(page, {
        x: xPos + 2,
        y: yPos - rowHeights[row + 1] + 2,
        width: colWidths[col] - 4,
        height: rowHeights[row + 1] - 4,
        textColor: rgb(0, 0, 0),
        backgroundColor: rgb(1, 1, 1),
        border: undefined,
      });
      textField.defaultUpdateAppearances(font);
      textField.setFontSize(8);
      xPos += colWidths[col];
    }
    yPos -= rowHeights[row + 1];
  }

  return await pdfDoc.save();
}

// Implemente a função para Template2 conforme sugerido antes

export async function generateEditablePdfTemplate2({ atividades, donoProcesso, objetivoProcesso, indicadores, servicosEntrada, servicoSaida }) {
  const { pdfDoc, page, font } = await createBasePdf();
  const form = pdfDoc.getForm();

  console.log("Template2 - servicosEntrada recebido:", servicosEntrada);
  console.log("Template2 - servicoSaida recebido:", servicoSaida);

  let yPos = yStart;

  // DONO DO PROCESSO
  page.drawText("DONO DO PROCESSO\n(nomeado):", { x: xStart, y: yPos, size: 12, font });
  const donoField = form.createTextField('dono_processo');
  donoField.enableMultiline();
  donoField.setText(donoProcesso || "");
  donoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // OBJETIVO DO PROCESSO
  page.drawText("OBJETIVO DO PROCESSO:", { x: xStart, y: yPos, size: 12, font });
  const objetivoField = form.createTextField('objetivo_processo');
  objetivoField.enableMultiline();
  objetivoField.setText(objetivoProcesso || "");
  objetivoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // SERVIÇOS DE ENTRADAS / SAÍDA
  page.drawText("SERVIÇOS DE ENTRADAS", { x: xStart, y: yPos, size: 12, font });
  page.drawText("SERVIÇO DE SAÍDA", { x: xStart + 320, y: yPos, size: 12, font });
  const entradaField = form.createTextField('servicos_entrada');
  entradaField.enableMultiline();
  entradaField.setText(servicosEntrada || "");
  entradaField.defaultUpdateAppearances(font);
  console.log("Campo servicos_entrada criado com valor:", servicosEntrada || "");
  entradaField.addToPage(page, { x: xStart, y: yPos - 28, width: 290, height: 48 });
  const saidaField = form.createTextField('servico_saida');
  saidaField.enableMultiline();
  saidaField.setText(servicoSaida || "");
  saidaField.defaultUpdateAppearances(font);
  console.log("Campo servico_saida criado com valor:", servicoSaida || "");
  saidaField.addToPage(page, { x: xStart + 320, y: yPos - 28, width: 230, height: 48 });
  yPos -= 88;

  // Cabeçalhos da tabela de atividades
  const headers = [
    "Principais Atividades",
    "Procedimentos Associados",
    "Requisitos ISO 9001",
    "Requisitos DGERT",
    "Requisitos EQAVET",
    "Requisitos CQCQ"
  ];

  // Desenha grid e cabeçalhos da tabela de atividades
  drawTemplate2Table(page, font, yPos, atividades, headers);

  // Campos editáveis para cada célula de atividades
  let camposY = yPos - 20; // primeira linha de dados
  for (let row = 0; row < atividades.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < atividades[row].length; col++) {
      const fieldName = `atividades_r${row + 1}_c${col + 1}`;
      const textField = form.createTextField(fieldName);
      textField.setText(atividades[row][col] || "");
      textField.addToPage(page, { x: xPos + 2, y: camposY + 2, width: colWidthTemplate2[col] - 4, height: 16 });
      xPos += colWidthTemplate2[col];
    }
    camposY -= 20;
  }

  // Indicadores
  let indicadoresY = camposY - 32;
  page.drawText("Indicadores de monitorização do processo", { x: xStart, y: indicadoresY, size: 12, font });
  indicadoresY -= 22;
  for (let row = 0; row < indicadores.length; row++) {
    const fieldName = `indicadores_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(indicadores[row][0] || "");
    textField.addToPage(page, { x: xStart, y: indicadoresY, width: 550, height: 28 });
    indicadoresY -= 32;
  }

  return await pdfDoc.save();
}

// Função para gerar PDF não editável do Template 2
export async function generateNonEditablePdfTemplate2(atividades, donoProcesso, objetivoProcesso, indicadores, servicosEntrada, servicoSaida) {
  const { pdfDoc, page, font } = await createBasePdf();

  // Validações de entrada
  const safeAtividades = Array.isArray(atividades) && atividades.length > 0 ? atividades : [['', '', '', '', '', '']];
  const safeIndicadores = Array.isArray(indicadores) && indicadores.length > 0 ? indicadores : [''];
  const safeDonoProcesso = donoProcesso || '';
  const safeObjetivoProcesso = objetivoProcesso || '';
  const safeServicosEntrada = servicosEntrada || '';
  const safeServicoSaida = servicoSaida || '';

  console.log("generateNonEditablePdfTemplate2 - dados recebidos:");
  console.log("atividades:", safeAtividades);
  console.log("donoProcesso:", safeDonoProcesso);
  console.log("objetivoProcesso:", safeObjetivoProcesso);
  console.log("indicadores:", safeIndicadores);
  console.log("servicosEntrada:", safeServicosEntrada);
  console.log("servicoSaida:", safeServicoSaida);

  // Usar a função utilitária para desenhar a tabela de cabeçalho do processo
  let yPos = drawProcessHeaderTable(page, font, yStart, safeDonoProcesso, safeObjetivoProcesso, safeServicosEntrada, safeServicoSaida);

  // Headers da tabela de atividades
  const headers = [
    "Principais\nAtividades",
    "Procedimentos\nAssociados", 
    "Requisitos\nISO 9001",
    "Requisitos\nDGERT",
    "Requisitos\nEQAVET",
    "Requisitos\nCQCQ"
  ];

  // Desenha tabela de atividades
  const fontSize = 8;
  const lineHeight = fontSize + 2;
  
  // Calcula altura das linhas dinamicamente
  const maxWidths = colWidthTemplate2.map(w => w - 8);
  const wrappedAtividades = safeAtividades.map(row =>
    row.map((cell, col) => {
      const cellText = (cell || '').toString();
      return wrapText(cellText, font, fontSize, maxWidths[col] || 80);
    })
  );
  
  const rowHeights = wrappedAtividades.map(row => {
    const heights = row.map(lines => {
      const height = lines.length * lineHeight + 8;
      return isNaN(height) ? 30 : height;
    });
    const maxHeight = Math.max(...heights, 30);
    return isNaN(maxHeight) ? 30 : maxHeight;
  });
  rowHeights.unshift(40); // header height

  // Desenha grid da tabela de atividades
  const totalWidth = colWidthTemplate2.reduce((a, b) => a + b, 0);
  let currentY = yPos;
  
  // Desenha linhas horizontais
  for (let i = 0; i <= safeAtividades.length + 1; i++) {
    page.drawLine({
      start: { x: xStart, y: currentY },
      end: { x: xStart + totalWidth, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < rowHeights.length) {
      currentY -= rowHeights[i];
    }
  }

  // Desenha linhas verticais
  let currentX = xStart;
  for (let j = 0; j <= colWidthTemplate2.length; j++) {
    page.drawLine({
      start: { x: currentX, y: yPos },
      end: { x: currentX, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (j < colWidthTemplate2.length) {
      currentX += colWidthTemplate2[j];
    }
  }

  // Desenha headers
  let headerY = yPos - 20;
  let headerX = xStart;
  headers.forEach((header, col) => {
    const lines = header.split('\n');
    const colWidth = colWidthTemplate2[col];
    let startY = headerY - 5;
    
    lines.forEach((line, idx) => {
      const textWidth = font.widthOfTextAtSize(line, 9);
      const textX = headerX + (colWidth - textWidth) / 2;
      const textY = startY - idx * 10;
      page.drawText(line, {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });
    headerX += colWidth;
  });

  // Desenha dados das atividades
  let dataY = yPos - rowHeights[0];
  for (let row = 0; row < safeAtividades.length; row++) {
    let dataX = xStart;
    for (let col = 0; col < safeAtividades[row].length; col++) {
      const lines = wrappedAtividades[row][col];
      let textY = dataY - 4;
      
      for (let l = 0; l < lines.length; l++) {
        if (lines[l] && typeof lines[l] === 'string') {
          page.drawText(lines[l], {
            x: dataX + 2,
            y: textY - l * lineHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
      }
      dataX += colWidthTemplate2[col];
    }
    dataY -= rowHeights[row + 1];
  }

  // Desenha indicadores
  let indicadoresY = dataY - 20;
  page.drawText("Indicadores de monitorização do processo", { 
    x: xStart, 
    y: indicadoresY, 
    size: 11, 
    font,
    color: rgb(0, 0, 0),
  });
  
  indicadoresY -= 20;
  safeIndicadores.forEach((indicador, idx) => {
    const text = indicador.toString();
    const lines = wrapText(text, font, fontSize, 550);
    
    lines.forEach((line, lineIdx) => {
      page.drawText(`${idx + 1}. ${lineIdx === 0 ? line : '   ' + line}`, {
        x: xStart,
        y: indicadoresY - lineIdx * lineHeight,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });
    indicadoresY -= (lines.length * lineHeight + 10);
  });

  return await pdfDoc.save();
}

// Função principal para gerar PDF não editável
export async function generateNonEditablePdf(data, headers, dataObs) {
  const { pdfDoc, page: firstPage, font } = await createBasePdf();

  // Validações de entrada
  const safeData = Array.isArray(data) && data.length > 0 ? data : [['', '', '', '', '']];
  const safeHeaders = Array.isArray(headers) && headers.length > 0 ? headers : ['', '', '', '', ''];
  const safeDataObs = Array.isArray(dataObs) && dataObs.length > 0 ? dataObs : [['']];
  
  console.log("generateNonEditablePdf - dados recebidos:");
  console.log("data:", safeData);
  console.log("headers:", safeHeaders);
  console.log("dataObs:", safeDataObs);

  // Calcule a altura real da tabela de observações
  const fontSize = 6;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const obsDataForHeight = Array.from({ length: Math.max(5, safeDataObs.length) }, (_, i) =>
    Array.isArray(safeDataObs[i]) ? safeDataObs[i] : [""]
  );
  const rowHeightsObs = obsDataForHeight.map(row => {
    const text = (row[0] || '').toString();
    const lines = wrapText(text, font, fontSize, maxWidth);
    const height = Math.max(obsRowHeight, lines.length * lineHeight + 16);
    return isNaN(height) ? obsRowHeight : height;
  });
  const obsTableHeightReal = rowHeightsObs.reduce((a, b) => (isNaN(a) ? 0 : a) + (isNaN(b) ? 0 : b), 0);

  // Desenha tabela de observações na primeira página
  drawObsTable(firstPage, font, safeDataObs);

  // --- Quebra de texto e altura dinâmica das linhas ---
  const maxWidths = colWidths.map(w => w - 8);

  // Calcula as linhas quebradas e alturas de cada linha
  const wrappedData = safeData.map(row =>
    row.map((cell, col) => {
      const cellText = (cell || '').toString();
      const maxWidth = maxWidths[col] || 100;
      return wrapText(cellText, font, fontSize, maxWidth);
    })
  );
  const rowHeightsDynamic = wrappedData.map(
    row => {
      const heights = row.map(lines => {
        const height = lines.length * lineHeight + 16;
        return isNaN(height) ? 50 : height;
      });
      const maxHeight = Math.max(...heights, 50);
      return isNaN(maxHeight) ? 50 : maxHeight;
    }
  );
  rowHeightsDynamic.unshift(50); // header
  
  console.log("rowHeightsDynamic calculado:", rowHeightsDynamic);

  // Parâmetros de página
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const marginBottom = 25;

  // Posição inicial da tabela principal
  let yPos = yStart - obsTableHeightReal - spaceBetweenTables;
  let page = firstPage;
  let rowIndex = 0;
  let isFirstPage = true;

  // Função para desenhar headers
  function drawTableHeaders(page, y, headerHeight) {
    let xPos = xStart;
    safeHeaders.forEach((header, col) => {
      const lines = (header || "").split('\n');
      const colWidth = colWidths[col] || 100;
      const totalTextHeight = lines.length * 12;
      let startY = y - ((headerHeight - totalTextHeight) / 2) - fontSize;
      lines.forEach((line, idx) => {
        const textWidth = font.widthOfTextAtSize(line, 10);
        const textX = xPos + (colWidth - textWidth) / 2;
        const textY = startY - idx * 12;
        page.drawText(line, {
          x: textX,
          y: textY,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
      });
      xPos += colWidths[col] || 100;
    });
  }

  // Função para desenhar linhas horizontais e verticais da tabela
  function drawTableGrid(page, yStartTable, rowHeights, numRows, drawTopLine = true) {
    let y = yStartTable;
    // Desenha linhas horizontais
    for (let i = 0; i <= numRows; i++) {
      if (i === 0 && !drawTopLine) {
        y -= rowHeights[i] || 0;
        continue;
      }
      page.drawLine({
        start: { x: xStart, y: y },
        end: { x: xStart + totalWidth, y: y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      if (i < numRows) {
        y -= rowHeights[i] || 0;
      }
    }
    // Desenha linhas verticais
    let xPos = xStart;
    const totalVerticalHeight = rowHeights.slice(0, numRows + (drawTopLine ? 1 : 0)).reduce((a, b) => a + b, 0);
    for (let j = 0; j <= colWidths.length; j++) {
      page.drawLine({
        start: { x: xPos, y: yStartTable },
        end: { x: xPos, y: yStartTable - totalVerticalHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      if (j < colWidths.length) {
        xPos += colWidths[j];
      }
    }
  }

  // Desenha a tabela principal, quebrando para nova página se necessário
  while (rowIndex < safeData.length) {
    // Calcular espaço disponível nesta página
    let availableHeight;
    if (isFirstPage) {
      availableHeight = yPos - marginBottom;
    } else {
      yPos = yStart;
      availableHeight = yPos - marginBottom;
    }

    // Quantas linhas cabem nesta página?
    let rowsThisPage = 0;
    let heightSum = isFirstPage ? rowHeightsDynamic[0] : 0; // header só na primeira página
    while (
      rowIndex + rowsThisPage < safeData.length &&
      heightSum + rowHeightsDynamic[rowIndex + rowsThisPage + 1] <= availableHeight
    ) {
      heightSum += rowHeightsDynamic[rowIndex + rowsThisPage + 1];
      rowsThisPage++;
    }

    // Desenha grid e headers
    const rowsToDraw = rowsThisPage > 0 ? rowsThisPage : 1;
    if (isFirstPage) {
      drawTableGrid(page, yPos, [rowHeightsDynamic[0], ...rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw)], rowsToDraw, true);
      drawTableHeaders(page, yPos, rowHeightsDynamic[0]);
    } else {
      drawTableGrid(page, yPos, rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw), rowsToDraw, false);
    }

    // Desenha dados
    let yData = yPos - (isFirstPage ? rowHeightsDynamic[0] : 0);
    for (let i = 0; i < rowsToDraw; i++) {
      let xPos = xStart;
      const row = rowIndex + i;
      
      // Validação adicional para garantir que os dados existem
      if (!safeData[row] || !Array.isArray(safeData[row])) {
        console.warn(`Linha ${row} não encontrada ou não é array:`, safeData[row]);
        continue;
      }
      
      if (!wrappedData[row] || !Array.isArray(wrappedData[row])) {
        console.warn(`wrappedData linha ${row} não encontrada ou não é array:`, wrappedData[row]);
        continue;
      }
      
      for (let col = 0; col < safeData[row].length; col++) {
        const lines = wrappedData[row][col];
        if (!Array.isArray(lines)) {
          console.warn(`lines não é array para row ${row}, col ${col}:`, lines);
          continue;
        }
        
        let textY = yData - 8;
        for (let l = 0; l < lines.length; l++) {
          if (lines[l] && typeof lines[l] === 'string') {
            page.drawText(lines[l], {
              x: xPos + 4,
              y: textY - l * lineHeight,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              maxWidth: maxWidths[col] || 100,
            });
          }
        }
        xPos += colWidths[col];
      }
      yData -= rowHeightsDynamic[row + 1];
    }

    rowIndex += rowsToDraw;

    // Se ainda há linhas, cria nova página e continua
    if (rowIndex < safeData.length) {
      page = pdfDoc.addPage(pageSize);
      yPos = yStart;
      isFirstPage = false;
    }
  }

  return await pdfDoc.save();
}

/**
 * @param {string} mainTableHtml
 * @param {string} obsTableHtml
 * @returns {Promise<Uint8Array>}
 */
export async function generateNonEditablePdfFromHtml(mainTableHtml, obsTableHtml) {
  const parser = new DOMParser();
  // Função para extrair texto de uma célula, convertendo <br> em \n
  function getCellTextWithBreaks(cell) {
    let text = "";
    cell.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        text += node.nodeValue.replace(/<br\s*\/?>/gi, "\n");
      } else if (node.nodeName === "BR") {
        text += "\n";
      } else if (node.nodeType === 1) {
        text += getCellTextWithBreaks(node);
      }
    });
    return text;
  }

  const htmlTableToArray = (html) => {
    const doc = parser.parseFromString(html, "text/html");
    const rows = [];
    doc.querySelectorAll("tr").forEach(tr => {
      const cells = [];
      tr.querySelectorAll("th,td").forEach(cell => {
        cells.push(getCellTextWithBreaks(cell));
      });
      rows.push(cells);
    });
    return rows;
  };

  const mainTableArr = htmlTableToArray(mainTableHtml);
  const obsTableArr = htmlTableToArray(obsTableHtml);

  const headers = mainTableArr[0] || [];
  const data = mainTableArr.slice(1);
  const headersObs = obsTableArr[0] || [];
  const dataObs = obsTableArr.slice(1);

  return await generateNonEditablePdf(data, headers, dataObs, headersObs);
}

// Adicione esta função utilitária
export function drawProcessHeaderTable(page, font, yPos, donoProcesso, objetivoProcesso, servicosEntrada, servicoSaida) {
  // Larguras das colunas
  const totalWidth = 500;
  const leftColWidth = 180;
  const rightColWidth = totalWidth - leftColWidth;
  const rowHeight = 32;
  const headerHeight = 28;
  const entradaSaidaHeight = 24;
  const contentHeight = 110;

  // DONO DO PROCESSO
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight,
    width: leftColWidth,
    height: headerHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight,
    width: rightColWidth,
    height: headerHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('DONO DO PROCESSO\n(nomeado):', {
    x: xStart + 8,
    y: yPos - 18,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    fontWeight: 'bold',
  });
  page.drawText(donoProcesso || '', {
    x: xStart + leftColWidth + 8,
    y: yPos - 18,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  // OBJETIVO DO PROCESSO
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight,
    width: leftColWidth,
    height: rowHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight,
    width: rightColWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('OBJETIVO DO PROCESSO:', {
    x: xStart + 8,
    y: yPos - headerHeight - 18,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    fontWeight: 'bold',
  });
  page.drawText(objetivoProcesso || '', {
    x: xStart + leftColWidth + 8,
    y: yPos - headerHeight - 18,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    maxWidth: rightColWidth - 16,
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Cabeçalho
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: leftColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: rightColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('SERVIÇOS DE ENTRADAS', {
    x: xStart + 8,
    y: yPos - headerHeight - rowHeight - 14,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    fontWeight: 'bold',
  });
  page.drawText('SERVIÇO DE SAÍDA', {
    x: xStart + leftColWidth + 8,
    y: yPos - headerHeight - rowHeight - 14,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    fontWeight: 'bold',
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Conteúdo
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: leftColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: rightColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Texto dos serviços (ajuste wrapText conforme necessário)
  let fontSize = 10;
  let entradaLines = (servicosEntrada || '').split('\n');
  let saidaLines = (servicoSaida || '').split('\n');
  let entradaY = yPos - headerHeight - rowHeight - entradaSaidaHeight - 18;
  let saidaY = entradaY;
  entradaLines.forEach(line => {
    page.drawText(line, {
      x: xStart + 8,
      y: entradaY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: leftColWidth - 16,
    });
    entradaY -= 14;
  });
  saidaLines.forEach(line => {
    page.drawText(line, {
      x: xStart + leftColWidth + 8,
      y: saidaY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: rightColWidth - 16,
    });
    saidaY -= 14;
  });

  // Retorne a nova posição Y para continuar desenhando abaixo
  return yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight - 20;
}
