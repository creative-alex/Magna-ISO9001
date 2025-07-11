import { rgb } from 'pdf-lib';
import { xStart, yStart, wrapText } from './pdfBase';

export const colWidths = [150, 140, 70, 70, 70];
export const obsColWidth = [500];
export const obsRowHeight = 25;
export const spaceBetweenTables = 30;

// Template 2
export const colWidthsTemplate2 = [80, 80, 80, 80, 80, 80];

// Função para obter o número de linhas da tabela de observações
export function getObsRows(dataObs) {
  // Garante pelo menos 3 linhas
  return Math.max(3, Array.isArray(dataObs) ? dataObs.length : 0);
}

// Função para desenhar a tabela de observações
export function drawObsTable(page, font, dataObs) {
  const obsRows = getObsRows(dataObs);
  const safeDataObs = Array.from({ length: obsRows }, (_, i) =>
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

  let yPos = yStart;
  for (let i = 0; i <= obsRows; i++) {
    page.drawLine({
      start: { x: xStart, y: yPos },
      end: { x: xStart + obsColWidth[0], y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPos -= rowHeights[i] || 0;
  }

  // Linhas verticais
  page.drawLine({
    start: { x: xStart, y: yStart },
    end: { x: xStart, y: yStart - rowHeights.reduce((a, b) => a + b, 0) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: xStart + obsColWidth[0], y: yStart },
    end: { x: xStart + obsColWidth[0], y: yStart - rowHeights.reduce((a, b) => a + b, 0) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Dados
  yPos = yStart;
  for (let row = 0; row < obsRows; row++) {
    const text = safeDataObs[row][0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    let textY = yPos - 12;
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: xStart + 4,
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

// Função para desenhar as linhas da tabela principal
export function drawTableLines(page, yOffset = 0, yOrigin = null, rowHeights = []) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = yOrigin !== null ? yOrigin : yStart - drawObsTable.lastTableHeight - spaceBetweenTables - yOffset;

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
      start: { x: xPos, y: yOrigin !== null ? yOrigin : yStart - drawObsTable.lastTableHeight - spaceBetweenTables - yOffset },
      end: { x: xPos, y: (yOrigin !== null ? yOrigin : yStart - drawObsTable.lastTableHeight - spaceBetweenTables - yOffset) - rowHeights.reduce((a, b) => a + b, 0) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidths[j] || 0;
  }
}

// Função para desenhar os cabeçalhos da tabela principal
export function drawHeaders(page, headers, font, yOffset = 0, yOrigin = null, rowHeights = []) {
  let xPos = xStart;
  const yHeaders = yOrigin !== null ? yOrigin : yStart - drawObsTable.lastTableHeight - spaceBetweenTables - yOffset;
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

// Função para desenhar a tabela do Template 2
export function colWidthsTemplate2(page, font, yStart, atividades, headers) {
  const rowHeight = 20;
  let yPos = yStart;

  // Cabeçalhos
  let xPos = xStart;
  headers.forEach((header, idx) => {
    page.drawText(header, { x: xPos + 4, y: yPos - 14, size: 10, font });
    xPos += colWidthsTemplate2[idx];
  });

  // Grid horizontal
  let totalRows = atividades.length + 1; // +1 para header
  let gridY = yPos;
  for (let i = 0; i <= totalRows; i++) {
    page.drawLine({
      start: { x: xStart, y: gridY },
      end: { x: xStart + colWidthsTemplate2.reduce((a, b) => a + b, 0), y: gridY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    gridY -= rowHeight;
  }

  // Grid vertical
  xPos = xStart;
  for (let j = 0; j <= colWidthsTemplate2.length; j++) {
    page.drawLine({
      start: { x: xPos, y: yPos },
      end: { x: xPos, y: yPos - rowHeight * totalRows },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidthsTemplate2[j] || 0;
  }
}
