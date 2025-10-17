
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Função para desenhar histórico de edições na última página do PDF
export function addEditHistoryToPdf(page, font, editHistory) {
  if (!editHistory || !Array.isArray(editHistory) || editHistory.length === 0) return;
  const { width } = page.getSize();
  const fontSize = 10;
  let y = 60; // Rodapé, ajustável
  page.drawText('Historico de Edicoes:', {
    x: 50,
    y,
    size: fontSize + 2,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 18;
  editHistory.forEach((entry) => {
    // entry: { date, user, before, after }
    const line = `${entry.date} ${entry.user} Modificou\n${entry.before} para ${entry.after}`;
    page.drawText(line, {
      x: 50,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;
  });
}

export const colWidths = [150, 170, 60, 60, 60];
export const pageSize = [600, 800];
export const xStart = 50;
export const yStart = 680;

export const obsColWidth = [500];
export const obsRowHeight = 25;
export const obsRows = 5;
export const obsTableHeight = obsRows * obsRowHeight;
export const obsXStart = xStart;
export const obsYStart = yStart;

export const spaceBetweenTables = 20;

export async function addHeader(page, font, title, imageBytes = null, pathFilename) {
  console.log("?? addHeader chamado:", { title, hasImage: !!imageBytes, pathFilename });

  const { width, height } = page.getSize();
  
  // Desenhar o t�tulo (nome do documento) no topo ao centro - s� se n�o for o t�tulo padr�o
  if (title && title.trim() !== '' && title !== 'Procedimento') {
    const titleSize = 14;
    const titleWidth = font.widthOfTextAtSize(title, titleSize);
    const titleX = (width - titleWidth) / 2;
    const titleY = height - 40;
    page.drawText(title, {
      x: titleX,
      y: titleY,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
  
  // Desenhar pathFilename no canto extremo direito em duas linhas
    if (pathFilename) {
      const fileFontSize = 12;
      // Normaliza separadores (Windows \ -> /) e divide em pasta/arquivo
      const normalizedPath = pathFilename.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      const filename = parts.pop() || normalizedPath; // Nome do arquivo
      const folder = parts.join('/'); // Pasta(s)
      
      const marginRight = 50; // Mais para a esquerda (era 10, agora 50)
      
      // Primeira linha (pasta) - mais em baixo
      if (folder) {
        const folderWidth = font.widthOfTextAtSize(folder, fileFontSize);
        const folderX = width - folderWidth - marginRight;
        const folderY = height - 60; // Mais em baixo (era -20, agora -60)
      
      page.drawText(folder, {
        x: folderX,
        y: folderY,
        size: fileFontSize,
        font: font,
        color: rgb(0.6, 0.6, 0.6), // Cinzento mais claro para a pasta
      });
    }
    
    // Segunda linha (nome do arquivo) - ainda mais em baixo
  const filenameWidth = font.widthOfTextAtSize(filename, fileFontSize);
    const filenameX = width - filenameWidth - marginRight;
    const filenameY = height - 75; // Mais em baixo (era -35, agora -75)
    
    page.drawText(filename, {
      x: filenameX,
      y: filenameY,
      size: fileFontSize,
      font: font,
      color: rgb(0.3, 0.3, 0.3), // Cinzento mais escuro para o arquivo
    });
  }
  
  if (imageBytes) {
    try {
      let image;
      const bytes = new Uint8Array(imageBytes);
      
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        console.log(" Detectado PNG");
        image = await page.doc.embedPng(imageBytes);
      }
      else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        console.log(" Detectado JPEG");
        image = await page.doc.embedJpg(imageBytes);
      } else {
        console.warn(" Formato não suportado");
        return;
      }
      
      const imageX = 20;
      const imageY = height - 150;
      
      const imageWidth = 230;
      const imageHeight = 160;

      page.drawImage(image, {
        x: imageX,
        y: imageY,
        width: imageWidth,
        height: imageHeight,
      });
      
      console.log(" Imagem adicionada!");
      
    } catch (error) {
      console.error(" Erro ao adicionar imagem:", error);
    }
  }

  // Removido o separador horizontal para não repetir em todas as páginas
}

export async function createBasePdf(title, imageBytes, pathFilename) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  await addHeader(page, font, title, imageBytes, pathFilename);

  // Função para desenhar histórico de edições na última página do PDF
  function addEditHistoryToPdf(page, font, editHistory) {
    if (!editHistory || !Array.isArray(editHistory) || editHistory.length === 0) return;
    const { width } = page.getSize();
    const fontSize = 10;
    let y = 60; // Rodapé, ajustável
    page.drawText('Histórico de Edições:', {
      x: 50,
      y,
      size: fontSize + 2,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;
    editHistory.forEach((entry) => {
      // entry: { date, user, before, after }
      const line = `${entry.date} ${entry.user} Modificou\n${entry.before} para ${entry.after}`;
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 16;
    });
  }
  
  return { pdfDoc, page, font };
}

export function wrapText(text, font, fontSize, maxWidth) {
  if (!text || text.toString().trim() === '') return [''];
  
  const textStr = text.toString();
  
  // Primeiro, divide por quebras de linha manuais (\n)
  const paragraphs = textStr.split('\n');
  const allLines = [];
  
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      allLines.push(''); // Preserva linhas vazias
      return;
    }
    
    const words = paragraph.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if (!word.trim()) return; // Ignora palavras vazias
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Se uma palavra individual é maior que maxWidth
          // Tenta quebrar a palavra por caracteres
          const chars = word.split('');
          let partialWord = '';
          
          chars.forEach(char => {
            const testChar = partialWord + char;
            const charWidth = font.widthOfTextAtSize(testChar, fontSize);
            
            if (charWidth <= maxWidth) {
              partialWord = testChar;
            } else {
              if (partialWord) {
                lines.push(partialWord);
                partialWord = char;
              } else {
                lines.push(char); // Força pelo menos um caractere
              }
            }
          });
          
          if (partialWord) {
            currentLine = partialWord;
          }
        }
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Adiciona as linhas deste parágrafo ao resultado final
    allLines.push(...lines);
  });
  
  return allLines.length > 0 ? allLines : [''];
}
