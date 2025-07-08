import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const colWidths = [150, 140, 70, 70, 70];
//const rowHeights = Array(7).fill(50);
export const pageSize = [600, 800];
export const xStart = 50;
export const yStart = 780;

export const obsColWidth = [500];
export const obsRowHeight = 25;
export const obsRows = 5;
export const obsTableHeight = obsRows * obsRowHeight;
export const obsXStart = xStart;
export const obsYStart = yStart;

export const spaceBetweenTables = 30;

export async function createBasePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(pageSize);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { pdfDoc, page, font };
}

export function wrapText(text, font, fontSize, maxWidth) {
  // Divide o texto em parágrafos, mantendo as quebras manuais
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
  }
  return lines;
}
