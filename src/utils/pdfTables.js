import { rgb } from 'pdf-lib';
import { xStart, yStart, wrapText } from './pdfBase';

// Template 1 - Larguras ajustadas para melhor acomodar texto
// Fluxo, Descrição, Responsável, Documentos Associados, Instruções
export const colWidths = [65, 200, 60, 95, 95];
export const obsColWidth = [515]; // Mantém o tamanho atual
export const obsRowHeight = 25;
export const spaceBetweenTables = 20;

// Template 2 - Larguras ajustadas para melhor distribuição do conteúdo
export const colWidthTemplate2 = [140, 200, 50, 50, 50, 50];

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
export function drawTableLines(page, obsTableHeight, yOrigin = null, rowHeights = []) {
  // Validate inputs to prevent NaN
  if (!Array.isArray(rowHeights) || rowHeights.length === 0) {
    rowHeights = [50]; // Default height
  }
  
  const safeObsTableHeight = typeof obsTableHeight === 'number' && !isNaN(obsTableHeight) ? obsTableHeight : 0;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = yOrigin !== null ? yOrigin : yStart - safeObsTableHeight - spaceBetweenTables;
  
  console.log("drawTableLines - obsTableHeight:", safeObsTableHeight);
  console.log("drawTableLines - yPos start:", yPos);
  console.log("drawTableLines - rowHeights:", rowHeights);

  // Desenha linhas horizontais (excluindo a primeira linha do header)
  for (let i = 1; i <= rowHeights.length; i++) {
    const currentY = yPos - (rowHeights.slice(0, i).reduce((a, b) => a + (b || 0), 0));
    console.log(`Drawing horizontal line ${i} at y: ${currentY}`);
    page.drawLine({
      start: { x: xStart, y: currentY },
      end: { x: xStart + totalWidth, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  // Desenha linhas verticais apenas para o corpo da tabela (abaixo do header)
  let xPos = xStart;
  const startY = yOrigin !== null ? yOrigin : yStart - safeObsTableHeight - spaceBetweenTables;
  const headerHeight = rowHeights[0] || 50;
  const bodyStartY = startY - headerHeight; // Inicia abaixo do header
  const endY = startY - rowHeights.reduce((a, b) => a + (b || 0), 0);
  
  console.log("drawTableLines - vertical lines bodyStartY:", bodyStartY, "endY:", endY);
  
  for (let j = 0; j <= colWidths.length; j++) {
    page.drawLine({
      start: { x: xPos, y: bodyStartY },
      end: { x: xPos, y: endY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidths[j] || 0;
  }
}

// Função para desenhar os cabeçalhos da tabela principal
export function drawHeaders(page, headers, font, obsTableHeight, yOrigin = null, rowHeights = []) {
  // Validate inputs
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRowHeights = Array.isArray(rowHeights) && rowHeights.length > 0 ? rowHeights : [50];
  const safeObsTableHeight = typeof obsTableHeight === 'number' && !isNaN(obsTableHeight) ? obsTableHeight : 0;
  
  let xPos = xStart;
  const yHeaders = yOrigin !== null ? yOrigin : yStart - safeObsTableHeight - spaceBetweenTables;
  const headerHeight = safeRowHeights[0] || 50;

  console.log("drawHeaders - yHeaders:", yHeaders, "headerHeight:", headerHeight);

  safeHeaders.forEach((header, col) => {
    const colWidth = colWidths[col] || 100; // Default width if undefined
    
    // Desenha o fundo cinza do header com bordas (igual ao Template 2)
    page.drawRectangle({
      x: xPos,
      y: yHeaders - headerHeight,
      width: colWidth,
      height: headerHeight,
      color: rgb(0.7, 0.7, 0.7),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    const lines = header.split('\n');
    const fontSize = 8;
    const lineHeight = 10;
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

    xPos += colWidths[col] || 100;
  });
}

// Função para desenhar a tabela do Template 2
export function drawTemplate2Table(page, font, yStart, atividades, headers) {
  const rowHeight = 20;
  let yPos = yStart;

  // Cabeçalhos
  let xPos = xStart;
  headers.forEach((header, idx) => {
    page.drawText(header, { x: xPos + 4, y: yPos - 14, size: 10, font });
    xPos += colWidthTemplate2[idx];
  });

  // Grid horizontal
  let totalRows = atividades.length + 1; // +1 para header
  let gridY = yPos;
  for (let i = 0; i <= totalRows; i++) {
    page.drawLine({
      start: { x: xStart, y: gridY },
      end: { x: xStart + colWidthTemplate2.reduce((a, b) => a + b, 0), y: gridY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    gridY -= rowHeight;
  }

  // Grid vertical
  xPos = xStart;
  for (let j = 0; j <= colWidthTemplate2.length; j++) {
    page.drawLine({
      start: { x: xPos, y: yPos },
      end: { x: xPos, y: yPos - rowHeight * totalRows },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    xPos += colWidthTemplate2[j] || 0;
  }
}
