import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Configuração da tabela principal
const colWidths = [150, 140, 70, 70, 70];
const rowHeights = Array(7).fill(50);
const pageSize = [600, 800];
const xStart = 50;
const yStart = 750;

// Configuração da tabela de observações
const obsColWidth = [500];
const obsRowHeight = 100;
const obsRows = 5;
const obsTableHeight = obsRows * obsRowHeight;
const obsXStart = xStart;
const obsYStart = yStart;

// Espaço entre as tabelas
const spaceBetweenTables = 30;

async function createBasePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { pdfDoc, page, font };
}

// Função utilitária para quebrar texto em várias linhas
function wrapText(text, font, fontSize, maxWidth) {
  let lines = [];
  let currentLine = '';

  for (let word of text.split(' ')) {
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      // Palavra muito longa, quebra-a em pedaços
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

  const fontSize = 8;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;

  // Calcula a altura de cada linha com base no texto
  const rowHeights = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16); // 16 = padding
  });

  // Desenha linhas horizontais
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

  // Retorna a altura total da tabela de observações
  return rowHeights.reduce((a, b) => a + b, 0);
}

function drawTableLines(page, yOffset = 0) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = yStart - obsTableHeight - spaceBetweenTables - yOffset;

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
      start: { x: xPos, y: yStart - obsTableHeight - spaceBetweenTables - yOffset },
      end: { x: xPos, y: yStart - obsTableHeight - spaceBetweenTables - yOffset - rowHeights.reduce((a, b) => a + b, 0) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidths[j] || 0;
  }
}

function drawHeaders(page, headers, font, yOffset = 0) {
  let xPos = xStart;
  const yHeaders = yStart - obsTableHeight - spaceBetweenTables - yOffset;
  const headerHeight = rowHeights[0];

  headers.forEach((header, col) => {
    const lines = header.split('\n');
    const colWidth = colWidths[col];
    const fontSize = 10;
    const lineHeight = 12;
    const totalTextHeight = lines.length * lineHeight;
    // Centraliza verticalmente dentro da célula
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

  // Desenha tabela de observações (sem headers) e obtém altura real
  const obsTableHeightReal = drawObsTable(page, font, dataObs);

  // Campos editáveis para tabela de observações
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

/**
 * Gera um PDF não editável a partir de dados (arrays).
 */
async function generateNonEditablePdf(data, headers, dataObs, headersObs) {
  const { pdfDoc, page, font } = await createBasePdf();

  // Desenha tabela de observações e obtém altura real
  const obsTableHeightReal = drawObsTable(page, font, dataObs);

  // Desenha tabela principal
  drawTableLines(page, obsTableHeightReal - obsTableHeight);
  drawHeaders(page, headers, font, obsTableHeightReal - obsTableHeight);

  // Preenche dados da tabela principal
  let yPos = yStart - obsTableHeightReal - spaceBetweenTables - rowHeights[0];
  for (let row = 0; row < data.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < data[row].length; col++) {
      const text = data[row][col] || "";
      page.drawText(text, {
        x: xPos + 4,
        y: yPos - rowHeights[row + 1] + 8,
        size: 8,
        font,
        color: rgb(0, 0, 0),
        maxWidth: colWidths[col] - 8,
      });
      xPos += colWidths[col];
    }
    yPos -= rowHeights[row + 1];
  }

  return await pdfDoc.save();
}

/**
 * Gera um PDF não editável a partir de HTML de tabelas.
 * @param {string} mainTableHtml - HTML da tabela principal
 * @param {string} obsTableHtml - HTML da tabela de observações
 * @returns {Promise<Uint8Array>} PDF em bytes
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
        // Usa innerText para manter quebras de linha e espaços
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
