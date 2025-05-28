import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Configuração da tabela principal
const colWidths = [150, 140, 70, 70, 70];
const rowHeights = Array(7).fill(50);
const pageSize = [600, 800];
const xStart = 50;
const yStart = 700;

// Configuração da tabela de observações
const obsColWidth = [500];
const obsRowHeight = 30;
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

function drawObsTable(page, font, dataObs) {
  // Garante sempre 5 linhas
  const safeDataObs = Array.from({ length: 5 }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );

  // Desenha linhas horizontais
  let yPos = obsYStart;
  for (let i = 0; i <= obsRows; i++) {
    page.drawLine({
      start: { x: obsXStart, y: yPos },
      end: { x: obsXStart + obsColWidth[0], y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPos -= obsRowHeight;
  }
  // Desenha linhas verticais
  page.drawLine({
    start: { x: obsXStart, y: obsYStart },
    end: { x: obsXStart, y: obsYStart - obsTableHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: obsXStart + obsColWidth[0], y: obsYStart },
    end: { x: obsXStart + obsColWidth[0], y: obsYStart - obsTableHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Removido o cabeçalho

  // Dados
  for (let row = 0; row < obsRows; row++) {
    const text = safeDataObs[row][0] || '';
    page.drawText(text, {
      x: obsXStart + 4,
      y: obsYStart - obsRowHeight * (row + 1) + 8,
      size: 8,
      font,
      color: rgb(0, 0, 0),
      maxWidth: obsColWidth[0] - 8,
    });
  }
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

  headers.forEach((header, col) => {
    const lines = header.split('\n');
    const colWidth = colWidths[col];

    lines.forEach((line, idx) => {
      const textWidth = font.widthOfTextAtSize(line, 10);
      const textX = xPos + (colWidth - textWidth) / 2;
      const textY = yHeaders - 10 - idx * 12 + 25;

      page.drawText(line, {
        x: textX,
        y: textY - idx * 12,
        size: 10,
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

  // Desenha tabela de observações (sem headers)
  drawObsTable(page, font, dataObs);

  // Campos editáveis para tabela de observações
  for (let row = 0; row < 5; row++) {
    const fieldName = `table1_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(dataObs && dataObs[row] ? dataObs[row][0] : "");
    textField.addToPage(page, {
      x: obsXStart + 2,
      y: obsYStart - obsRowHeight * (row + 1) + 2,
      width: obsColWidth[0] - 4,
      height: obsRowHeight - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(1, 1, 1),
      border: undefined,
    });
    textField.defaultUpdateAppearances(font);
    textField.setFontSize(8);
  }

  // Desenha tabela principal
  drawTableLines(page);
  drawHeaders(page, headers, font);

  let yPos = yStart - obsTableHeight - spaceBetweenTables - rowHeights[0];
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

async function generateNonEditablePdf(data, headers, dataObs, headersObs) {
  const { pdfDoc, page, font } = await createBasePdf();

  // Desenha tabela de observações
  drawObsTable(page, font, dataObs, headersObs);

  // Desenha tabela principal
  drawTableLines(page);
  drawHeaders(page, headers, font);

  let yPos = yStart - obsTableHeight - spaceBetweenTables - rowHeights[0];
  for (let row = 0; row < 6; row++) {
    let xPos = xStart;

    for (let col = 0; col < 5; col++) {
      const text = data[row][col] || '';
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

export { generateEditablePdf, generateNonEditablePdf };
