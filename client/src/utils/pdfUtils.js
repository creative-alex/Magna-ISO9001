import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateEditablePdf(data, headers) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colWidths = [150, 140, 70, 70, 70];
  const rowHeights = Array(7).fill(50);

  let y = 700;
  let x = 50;
  let totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = y;
  for (let i = 0; i <= 7; i++) {
    page.drawLine({
      start: { x, y: yPos },
      end: { x: x + totalWidth, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < 7) yPos -= rowHeights[i];
  }

  let xPos = x;
  for (let j = 0; j <= 5; j++) {
    page.drawLine({
      start: { x: xPos, y },
      end: { x: xPos, y: y - rowHeights.reduce((a, b) => a + b, 0) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (j < 5) xPos += colWidths[j];
  }

  // Headers com quebra de linha
  let headerX = x;
  for (let col = 0; col < 5; col++) {
    const lines = headers[col].split('\n');
    lines.forEach((line, idx) => {
      const textWidth = font.widthOfTextAtSize(line, 10);
      const colWidth = colWidths[col];
      const textX = headerX + (colWidth - textWidth) / 2;
      const textY = y - 10 - idx * 12 + 25;
      page.drawText(line, {
        x: textX,
        y: textY - idx * 12,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    });
    headerX += colWidths[col];
  }

  // Campos editáveis
  yPos = y - rowHeights[0];
  for (let row = 0; row < 6; row++) {
    xPos = x;
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

export async function generateNonEditablePdf(data, headers) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colWidths = [150, 140, 70, 70, 70];
  const rowHeights = Array(7).fill(50);

  let y = 700;
  let x = 50;
  let totalWidth = colWidths.reduce((a, b) => a + b, 0);
  let yPos = y;
  for (let i = 0; i <= 7; i++) {
    page.drawLine({
      start: { x, y: yPos },
      end: { x: x + totalWidth, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < 7) yPos -= rowHeights[i];
  }

  let xPos = x;
  for (let j = 0; j <= 5; j++) {
    page.drawLine({
      start: { x: xPos, y },
      end: { x: xPos, y: y - rowHeights.reduce((a, b) => a + b, 0) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (j < 5) xPos += colWidths[j];
  }

  // Headers com quebra de linha
  let headerX = x;
  for (let col = 0; col < 5; col++) {
    const lines = headers[col].split('\n');
    lines.forEach((line, idx) => {
      const textWidth = font.widthOfTextAtSize(line, 10);
      const colWidth = colWidths[col];
      const textX = headerX + (colWidth - textWidth) / 2;
      const textY = y - 10 - idx * 12 + 25;
      page.drawText(line, {
        x: textX,
        y: textY - idx * 12,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    });
    headerX += colWidths[col];
  }

  // Dados como texto (não editável)
  yPos = y - rowHeights[0];
  for (let row = 0; row < 6; row++) {
    xPos = x;
    for (let col = 0; col < 5; col++) {
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