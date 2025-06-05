import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const colWidths = [150, 140, 70, 70, 70];
const rowHeights = Array(7).fill(50);
const pageSize = [600, 800];
const xStart = 50;
const yStart = 780;

const obsColWidth = [500];
const obsRowHeight = 25;
const obsRows = 5;
const obsTableHeight = obsRows * obsRowHeight;
const obsXStart = xStart;
const obsYStart = yStart;

const spaceBetweenTables = 30;

async function createBasePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { pdfDoc, page, font };
}

function wrapText(text, font, fontSize, maxWidth) {
  // Remove quebras de linha, pois PDF-lib não suporta \n
  text = text.replace(/\n/g, ' ');
  let lines = [];
  let currentLine = '';

  for (let word of text.split(' ')) {
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      let subWord = '';
      for (let char of word) {
        const testSubWord = subWord + char;
        if (font.widthOfTextAtSize(testSubWord, fontSize) > maxWidth) {
          if (subWord) lines.push(subWord);
          subWord = char;
        } else {
          subWord = testSubWord;
        }
      }
      if (subWord) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        lines.push(subWord);
      }
    } else {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawObsTable(page, font, dataObs) {
  // Garante sempre 5 linhas
  const safeDataObs = Array.from({ length: 5 }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );

  const fontSize = 6;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;

  const rowHeights = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16); // 16 = padding
  });

  let yPos = obsYStart;
  for (let i = 0; i <= obsRows; i++) {
    page.drawLine({
      start: { x: obsXStart, y: yPos },
      end: { x: obsXStart + obsColWidth[0], y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPos -= rowHeights[i] || 0;
  }

  // Desenha linhas verticais
  page.drawLine({
    start: { x: obsXStart, y: obsYStart },
    end: { x: obsXStart, y: obsYStart - rowHeights.reduce((a, b) => a + b, 0) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: obsXStart + obsColWidth[0], y: obsYStart },
    end: { x: obsXStart + obsColWidth[0], y: obsYStart - rowHeights.reduce((a, b) => a + b, 0) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Dados
  yPos = obsYStart;
  for (let row = 0; row < obsRows; row++) {
    const text = safeDataObs[row][0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    let textY = yPos - 12;
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: obsXStart + 4,
        y: textY - i * lineHeight,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: maxWidth,
      });
    }
    yPos -= rowHeights[row];
  }

  return rowHeights.reduce((a, b) => a + b, 0);
}

function drawTableLines(page, yOffset = 0, yOrigin = null) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = yOrigin !== null ? yOrigin : yStart - obsTableHeight - spaceBetweenTables - yOffset;

  for (let i = 0; i <= rowHeights.length; i++) {
    page.drawLine({
      start: { x: xStart, y: yPos },
      end: { x: xStart + totalWidth, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPos -= rowHeights[i] || 0;
  }

  let xPos = xStart;
  for (let j = 0; j <= colWidths.length; j++) {
    page.drawLine({
      start: { x: xPos, y: yOrigin !== null ? yOrigin : yStart - obsTableHeight - spaceBetweenTables - yOffset },
      end: { x: xPos, y: (yOrigin !== null ? yOrigin : yStart - obsTableHeight - spaceBetweenTables - yOffset) - rowHeights.reduce((a, b) => a + b, 0) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidths[j] || 0;
  }
}

function drawHeaders(page, headers, font, yOffset = 0, yOrigin = null) {
  let xPos = xStart;
  const yHeaders = yOrigin !== null ? yOrigin : yStart - obsTableHeight - spaceBetweenTables - yOffset;
  const headerHeight = rowHeights[0];

  headers.forEach((header, col) => {
    const lines = header.split('\n');
    const colWidth = colWidths[col];
    const fontSize = 10;
    const lineHeight = 12;
    const totalTextHeight = lines.length * lineHeight;
    let startY = yHeaders - ((headerHeight - totalTextHeight) / 2) - fontSize;

    lines.forEach((line, idx) => {
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      const textX = xPos + (colWidth - textWidth) / 2;
      const textY = startY - idx * lineHeight;

      page.drawText(line, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });

    xPos += colWidths[col];
  });
}

async function generateEditablePdf(data, headers, dataObs) {
  const { pdfDoc, page, font } = await createBasePdf();
  const form = pdfDoc.getForm();

  const obsTableHeightReal = drawObsTable(page, font, dataObs);

  let yObs = obsYStart;
  const fontSize = 8;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const safeDataObs = Array.from({ length: 5 }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );
  const rowHeightsObs = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16);
  });
  for (let row = 0; row < 5; row++) {
    const fieldName = `table1_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(dataObs && dataObs[row] ? dataObs[row][0] : "");
    textField.addToPage(page, {
      x: obsXStart + 2,
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

  // Desenha tabela principal
  drawTableLines(page, obsTableHeightReal - obsTableHeight); // <-- Ajusta o offset
  drawHeaders(page, headers, font, obsTableHeightReal - obsTableHeight);

  let yPos = yStart - obsTableHeightReal - spaceBetweenTables - rowHeights[0];
  for (let row = 0; row < 6; row++) {
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


async function generateNonEditablePdf(data, headers, dataObs) {
  const { pdfDoc, page: firstPage, font } = await createBasePdf();

  // Calcule a altura real da tabela de observações
  const fontSize = 6;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const safeDataObs = Array.from({ length: 5 }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );
  const rowHeightsObs = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16);
  });
  const obsTableHeightReal = rowHeightsObs.reduce((a, b) => a + b, 0);

  // Desenha tabela de observações na primeira página
  drawObsTable(firstPage, font, dataObs);

  // --- Quebra de texto e altura dinâmica das linhas ---
  const maxWidths = colWidths.map(w => w - 8);

  // Calcula as linhas quebradas e alturas de cada linha
  const wrappedData = data.map(row =>
    row.map((cell, col) => wrapText(cell || "", font, fontSize, maxWidths[col]))
  );
  const rowHeightsDynamic = wrappedData.map(
    row =>
      Math.max(
        ...row.map(lines => lines.length * lineHeight + 16),
        50
      )
  );
  rowHeightsDynamic.unshift(50); // header

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
    headers.forEach((header, col) => {
      const lines = (header || "").split('\n');
      const colWidth = colWidths[col];
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
      xPos += colWidths[col];
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
    if (i < numRows) { // Evita subtrair altura após a última linha
      y -= rowHeights[i] || 0;
    }
  }
  
  // Desenha linhas verticais - CORREÇÃO
  let xPos = xStart;
  // Calcula a altura total corretamente
  const totalVerticalHeight = rowHeights.slice(0, numRows + (drawTopLine ? 1 : 0)).reduce((a, b) => a + b, 0);
  
  for (let j = 0; j <= colWidths.length; j++) {
    page.drawLine({
      start: { x: xPos, y: yStartTable },
      end: { x: xPos, y: yStartTable - totalVerticalHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (j < colWidths.length) { // Evita adicionar largura após a última coluna
      xPos += colWidths[j];
    }
  }
}



  // Desenha a tabela principal, quebrando para nova página se necessário
  while (rowIndex < data.length) {
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
      rowIndex + rowsThisPage < data.length &&
      heightSum + rowHeightsDynamic[rowIndex + 1] <= availableHeight
    ) {
      heightSum += rowHeightsDynamic[rowIndex + 1];
      rowsThisPage++;
    }

    // Desenha grid e headers
    const rowsToDraw = rowsThisPage > 0 ? rowsThisPage : 1;
    if (isFirstPage) {
      // Desenha cabeçalho e linha de topo só na primeira página
      drawTableGrid(page, yPos, [rowHeightsDynamic[0], ...rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw)], rowsToDraw, true);
      drawTableHeaders(page, yPos, rowHeightsDynamic[0]);
    } else {
      // Não desenha cabeçalho nem linha de topo nas páginas seguintes
      drawTableGrid(page, yPos, rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw), rowsToDraw, false);
    }

    // Desenha dados
    let yData = yPos - (isFirstPage ? rowHeightsDynamic[0] : 0);
    for (let i = 0; i < rowsToDraw; i++) {
      let xPos = xStart;
      const row = rowIndex + i;
      for (let col = 0; col < data[row].length; col++) {
        const lines = wrappedData[row][col];
        let textY = yData - 8;
        for (let l = 0; l < lines.length; l++) {
          page.drawText(lines[l], {
            x: xPos + 4,
            y: textY - l * lineHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: maxWidths[col],
          });
        }
        xPos += colWidths[col];
      }
      yData -= rowHeightsDynamic[row + 1];
    }

    rowIndex += rowsToDraw;

    // Se ainda há linhas, cria nova página e continua
    if (rowIndex < data.length) {
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

async function generateNonEditablePdfFromHtml(mainTableHtml, obsTableHtml) {
  const parser = new DOMParser();
  const htmlTableToArray = (html) => {
    // Substitui <br> por \n para manter quebras de linha nos headers
    html = html.replace(/<br\s*\/?>/gi, '\n');
    const doc = parser.parseFromString(html, "text/html");
    const rows = [];
    doc.querySelectorAll("tr").forEach(tr => {
      const cells = [];
      tr.querySelectorAll("th,td").forEach(cell => {
        cells.push(cell.innerText || cell.textContent || "");
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

export { generateEditablePdf, generateNonEditablePdf, generateNonEditablePdfFromHtml };
