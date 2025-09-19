import { xStart, yStart, wrapText } from './pdfBase';
import { obsColWidth } from './pdfTables';
import { rgb } from 'pdf-lib';

// Função para calcular a altura exata da tabela de observações
export function calculateObsTableHeight(dataObs, font) {
  const obsRows = 5; // Sempre 5 seções
  const safeDataObs = Array.from({ length: obsRows }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );

  const fontSize = 8;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const headerHeight = 25; // Altura dos headers
  const minContentHeight = 30; // Altura mínima do conteúdo

  // Calcula altura de cada seção (header + conteúdo)
  const sectionHeights = safeDataObs.map((row) => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    const contentHeight = Math.max(minContentHeight, lines.length * lineHeight + 16);
    return headerHeight + contentHeight;
  });

  return sectionHeights.reduce((a, b) => a + b, 0);
}

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
  
  // Garante que temos exatamente 5 seções na ordem correta
  const safeDataObs = Array.from({ length: obsRows }, (_, i) => {
    if (Array.isArray(dataObs) && Array.isArray(dataObs[i])) {
      return dataObs[i];
    } else if (Array.isArray(dataObs) && dataObs[i] !== undefined) {
      return [dataObs[i]]; // Converte string em array se necessário
    } else {
      return [""]; // Seção vazia
    }
  });

  console.log('🔍 DEBUG - Seções processadas para PDF:', safeDataObs.map((section, i) => 
    `${headers[i]} -> "${section[0] ? section[0].substring(0, 50) : 'vazio'}..."`
  ));

  const fontSize = 8;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const headerHeight = 25;
  const minContentHeight = 30;

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
