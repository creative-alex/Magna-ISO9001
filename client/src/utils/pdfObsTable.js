import { xStart, yStart, wrapText, pageSize, addHeader } from './pdfBase';
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

// Função para desenhar tabela de observações com headers cinza e continuação entre páginas
export async function drawObsTableWithHeaders(page, font, dataObs, imageBytes = null, pathFilename = '') {
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
  const pageBottomMargin = 50; // Margem inferior da página
  const maxYPosition = pageBottomMargin; // Posição Y mínima na página

  let currentPage = page;
  let yPos = yStart;
  let allPages = [page]; // Array para armazenar todas as páginas criadas
  
  // Função auxiliar para criar nova página
  const createNewPage = async () => {
    const newPage = currentPage.doc.addPage(pageSize);
    await addHeader(newPage, font, '', imageBytes, pathFilename);
    allPages.push(newPage);
    currentPage = newPage;
    yPos = yStart; // Reset da posição Y para o topo da nova página
    return newPage;
  };

  // Função auxiliar para verificar se há espaço suficiente na página atual
  const hasSpaceForContent = (requiredHeight) => {
    return yPos - requiredHeight >= maxYPosition;
  };

  // Função auxiliar para dividir texto em chunks que cabem na página
  const splitTextForPages = (lines, availableHeight) => {
    const linesPerPage = Math.floor((availableHeight - 16) / lineHeight); // -16 para padding
    const chunks = [];
    
    for (let i = 0; i < lines.length; i += linesPerPage) {
      chunks.push(lines.slice(i, i + linesPerPage));
    }
    
    return chunks;
  };
  
  // Desenha cada seção
  for (let i = 0; i < obsRows; i++) {
    const text = safeDataObs[i][0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    const contentHeight = Math.max(minContentHeight, lines.length * lineHeight + 16);
    const sectionHeight = headerHeight + contentHeight;
    
    // Verifica se a seção completa cabe na página atual
    if (!hasSpaceForContent(sectionHeight)) {
      // Se nem o header cabe, cria nova página
      if (!hasSpaceForContent(headerHeight)) {
        await createNewPage();
      }
      
      // Se ainda não cabe após nova página, divide o conteúdo
      if (!hasSpaceForContent(sectionHeight)) {
        // Desenha header na página atual
        currentPage.drawRectangle({
          x: xStart,
          y: yPos - headerHeight,
          width: obsColWidth[0],
          height: headerHeight,
          color: rgb(0.7, 0.7, 0.7),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        currentPage.drawText(headers[i], {
          x: xStart + 8,
          y: yPos - 15,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
        
        yPos -= headerHeight;
        
        // Calcula quanto espaço disponível temos para conteúdo na página atual
        const availableSpaceCurrentPage = yPos - maxYPosition;
        
        // Divide o texto em chunks que cabem nas páginas
        const textChunks = splitTextForPages(lines, availableSpaceCurrentPage);
        
        // Desenha primeiro chunk na página atual
        if (textChunks.length > 0) {
          const firstChunkHeight = Math.max(minContentHeight, textChunks[0].length * lineHeight + 16);
          
          currentPage.drawRectangle({
            x: xStart,
            y: yPos - firstChunkHeight,
            width: obsColWidth[0],
            height: firstChunkHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          
          let textY = yPos - 12;
          for (let j = 0; j < textChunks[0].length; j++) {
            currentPage.drawText(textChunks[0][j], {
              x: xStart + 4,
              y: textY - j * lineHeight,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              maxWidth: maxWidth,
            });
          }
          
          yPos -= firstChunkHeight;
        }
        
        // Desenha chunks restantes em novas páginas
        for (let chunkIndex = 1; chunkIndex < textChunks.length; chunkIndex++) {
          await createNewPage();
          
          const chunk = textChunks[chunkIndex];
          const chunkHeight = Math.max(minContentHeight, chunk.length * lineHeight + 16);
          
          // Desenha header de continuação (mais claro)
          currentPage.drawRectangle({
            x: xStart,
            y: yPos - headerHeight,
            width: obsColWidth[0],
            height: headerHeight,
            color: rgb(0.85, 0.85, 0.85), // Cor mais clara para indicar continuação
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          
          currentPage.drawText(`${headers[i]} (continuação)`, {
            x: xStart + 8,
            y: yPos - 15,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          
          yPos -= headerHeight;
          
          // Desenha conteúdo da continuação
          currentPage.drawRectangle({
            x: xStart,
            y: yPos - chunkHeight,
            width: obsColWidth[0],
            height: chunkHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          
          let textY = yPos - 12;
          for (let j = 0; j < chunk.length; j++) {
            currentPage.drawText(chunk[j], {
              x: xStart + 4,
              y: textY - j * lineHeight,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              maxWidth: maxWidth,
            });
          }
          
          yPos -= chunkHeight;
        }
        
      } else {
        // A seção cabe inteira na nova página
        await createNewPage();
        
        // Desenha header
        currentPage.drawRectangle({
          x: xStart,
          y: yPos - headerHeight,
          width: obsColWidth[0],
          height: headerHeight,
          color: rgb(0.7, 0.7, 0.7),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        currentPage.drawText(headers[i], {
          x: xStart + 8,
          y: yPos - 15,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
        
        // Desenha área de conteúdo
        currentPage.drawRectangle({
          x: xStart,
          y: yPos - sectionHeight,
          width: obsColWidth[0],
          height: contentHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        // Desenha conteúdo
        let textY = yPos - headerHeight - 12;
        for (let j = 0; j < lines.length; j++) {
          currentPage.drawText(lines[j], {
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
    } else {
      // A seção cabe inteira na página atual
      
      // Desenha header cinza
      currentPage.drawRectangle({
        x: xStart,
        y: yPos - headerHeight,
        width: obsColWidth[0],
        height: headerHeight,
        color: rgb(0.7, 0.7, 0.7),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Texto do header
      currentPage.drawText(headers[i], {
        x: xStart + 8,
        y: yPos - 15,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Desenha área de conteúdo
      currentPage.drawRectangle({
        x: xStart,
        y: yPos - sectionHeight,
        width: obsColWidth[0],
        height: contentHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Desenha conteúdo
      let textY = yPos - headerHeight - 12;
      for (let j = 0; j < lines.length; j++) {
        currentPage.drawText(lines[j], {
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
  }
  
  // Retorna informações sobre as páginas criadas
  return {
    totalHeight: 0, // Não aplicável com múltiplas páginas
    pages: allPages,
    currentPage: currentPage,
    currentYPosition: yPos
  };
}
