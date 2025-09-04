import { xStart, yStart, wrapText } from './pdfBase';
import { obsColWidth } from './pdfTables';
import { rgb } from 'pdf-lib';

// Função para desenhar tabela de observações com headers cinza
export function drawObsTableWithHeaders(page, font, dataObs) {
  const obsRows = 5; // Sempre 5 seções
  const headers = [
    "1. Objetivos:",
    "2. Campo de Aplicação:", 
    "3. Definições:",
    "4. Abreviaturas:",
    "5. Observações:"
  ];
  
  const safeDataObs = Array.from({ length: obsRows }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );

  const fontSize = 6;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const headerHeight = 25; // Altura dos headers
  const minContentHeight = 30; // Altura mínima do conteúdo

  // Calcula altura de cada seção (header + conteúdo)
  const sectionHeights = safeDataObs.map((row, i) => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    const contentHeight = Math.max(minContentHeight, lines.length * lineHeight + 16);
    return headerHeight + contentHeight;
  });

  let yPos = yStart;
  
  // Desenha cada seção
  for (let i = 0; i < obsRows; i++) {
    const sectionHeight = sectionHeights[i];
    
    // Desenha header cinza
    page.drawRectangle({
      x: xStart,
      y: yPos - headerHeight,
      width: obsColWidth[0],
      height: headerHeight,
      color: rgb(0.7, 0.7, 0.7),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Texto do header
    page.drawText(headers[i], {
      x: xStart + 8,
      y: yPos - 15,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Desenha área de conteúdo
    const contentHeight = sectionHeight - headerHeight;
    page.drawRectangle({
      x: xStart,
      y: yPos - sectionHeight,
      width: obsColWidth[0],
      height: contentHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Desenha conteúdo
    const text = safeDataObs[i][0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    let textY = yPos - headerHeight - 12;
    for (let j = 0; j < lines.length; j++) {
      page.drawText(lines[j], {
        x: xStart + 4,
        y: textY - j * lineHeight,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: maxWidth,
      });
    }
    
    yPos -= sectionHeight;
  }
  
  return sectionHeights.reduce((a, b) => a + b, 0);
}
