import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const colWidths = [150, 140, 70, 70, 70];
export const pageSize = [600, 800];
export const xStart = 50;
export const yStart = 680;

export const obsColWidth = [500];
export const obsRowHeight = 25;
export const obsRows = 5;
export const obsTableHeight = obsRows * obsRowHeight;
export const obsXStart = xStart;
export const obsYStart = yStart;

export const spaceBetweenTables = 30;

export async function addHeader(page, font, title, imageBytes = null, pathFilename) {
  console.log("🎯 addHeader chamado:", { title, hasImage: !!imageBytes, pathFilename });

  const { width, height } = page.getSize();
  
  // REMOVER O TÍTULO COMPLETAMENTE
  // (código do título removido)
  
  // Desenhar pathFilename no canto extremo direito em duas linhas
  if (pathFilename) {
    const fileFontSize = 12;
    
    // Dividir o pathFilename em duas partes (pasta e arquivo)
    const parts = pathFilename.split('/');
    const filename = parts.pop() || pathFilename; // Nome do arquivo
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
  
  const lineY = height - 130;
  page.drawLine({
    start: { x: 50, y: lineY },
    end: { x: width - 50, y: lineY },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export async function createBasePdf(title, imageBytes, pathFilename) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  await addHeader(page, font, title, imageBytes, pathFilename);
  
  return { pdfDoc, page, font };
}

export function wrapText(text, font, fontSize, maxWidth) {
  const paragraphs = text.split('\n');
  let lines = [];
  for (const para of paragraphs) {
    let currentLine = '';
    for (let word of para.split(' ')) {
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let subWord = '';
        for (let char of word) {
          const testSubWord = subWord + char;
          if (font.widthOfTextAtSize(testSubWord, fontSize) > maxWidth) {
            if (subWord) {
              lines.push(currentLine + subWord);
              currentLine = '';
              subWord = char;
            } else {
              lines.push(char);
            }
          } else {
            subWord = testSubWord;
          }
        }
        if (subWord) {
          if (currentLine) {
            lines.push(currentLine + subWord);
            currentLine = '';
          } else {
            lines.push(subWord);
          }
        }
      } else {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            lines.push(word);
          }
        } else {
          currentLine = testLine;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    if (para === '') {
      lines.push('');
    }
  }
  return lines;
}
