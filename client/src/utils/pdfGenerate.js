import { createBasePdf, wrapText, pageSize, xStart, yStart } from './pdfBase';
import { drawTableLines, drawHeaders, drawObsTable, getObsRows, colWidths, obsColWidth, obsRowHeight, spaceBetweenTables, drawTemplate2Table, colWidthTemplate2 } from './pdfTables';
import { drawObsTableWithHeaders } from './pdfObsTable';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, PDFDict } from 'pdf-lib';

// Função principal para gerar PDF editável
export async function generateEditablePdf({
  templateType = 1,
  data,
  headers,
  dataObs,
  headersObs,
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida,
  imageBytes = null, // Novo parâmetro para imagem
  pathFilename = "" // Novo parâmetro para caminho do ficheiro
}) {
    console.log("🎯 generateEditablePdf recebeu pathFilename:", pathFilename); 

  if (templateType === 2) {
    return await generateEditablePdfTemplate2({
      atividades,
      donoProcesso,
      objetivoProcesso,
      indicadores,
      servicosEntrada,
      servicoSaida,
      title,
      imageBytes,
      pathFilename
    });
  } else {
    return await generateEditablePdfTemplate1(data, headers, dataObs, headersObs, title, imageBytes, pathFilename);
  }
}


// Renomeie a função antiga para Template1
export async function generateEditablePdfTemplate1(data, headers, dataObs, headersObs, title = "Procedimento", imageBytes = null, pathFilename = "") {
  const { pdfDoc, page, font } = await createBasePdf(title, imageBytes, pathFilename);
  const form = pdfDoc.getForm();
  console.log("🎯 generateEditablePdf recebeu pathFilename:", pathFilename); 

  // Validate and ensure data is an array
  const safeData = Array.isArray(data) ? data : [];
  const safeHeaders = Array.isArray(headers) ? headers : [];

  // Use obsRows dinâmico
  const obsRows = getObsRows(dataObs);
  const obsTableHeightReal = drawObsTable(page, font, dataObs);
  
  console.log("obsRows:", obsRows);
  console.log("obsTableHeightReal:", obsTableHeightReal);
  console.log("data.length:", safeData.length);

  let yObs = yStart;
  const fontSize = 2;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const safeDataObs = Array.from({ length: obsRows }, (_, i) =>
    Array.isArray(dataObs) && Array.isArray(dataObs[i]) ? dataObs[i] : [""]
  );
  const rowHeightsObs = safeDataObs.map(row => {
    const text = row[0] || '';
    const lines = wrapText(text, font, fontSize, maxWidth);
    return Math.max(obsRowHeight, lines.length * lineHeight + 16);
  });
  for (let row = 0; row < obsRows; row++) {
    const fieldName = `table1_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(dataObs && dataObs[row] ? dataObs[row][0] : "");
    textField.addToPage(page, {
      x: xStart + 2,
      y: yObs - rowHeightsObs[row] + 2,
      width: obsColWidth[0] - 4,
      height: rowHeightsObs[row] - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(1, 1, 1),
      border: undefined,
    });
    textField.defaultUpdateAppearances(font);
    textField.setFontSize(8);
    yObs -= rowHeightsObs[row];
  }

  // Gere dinamicamente os rowHeights para a tabela principal
  const rowHeights = Array(safeData.length + 1).fill(50); // +1 para o header

  // Desenha tabela principal
  // Primeiro desenha as linhas da tabela
  drawTableLines(page, obsTableHeightReal, undefined, rowHeights);
  
  // DEPOIS desenha os headers com fundo cinza por cima (igual Template 2)
  let xPos = xStart;
  const yHeaders = yStart - obsTableHeightReal - spaceBetweenTables;
  const headerHeight = rowHeights[0] || 50;
  
  safeHeaders.forEach((header, col) => {
    const colWidth = colWidths[col] || 100;
    
    // Quadrado cinza do header (igual Template 2)
    page.drawRectangle({
      x: xPos,
      y: yHeaders - headerHeight,
      width: colWidth,
      height: headerHeight,
      color: rgb(0.7, 0.7, 0.7),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Texto do header
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

    xPos += colWidth;
  });

  let yPos = yStart - obsTableHeightReal - spaceBetweenTables - rowHeights[0];
  for (let row = 0; row < safeData.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < 5; col++) {
      const fieldName = `table2_r${row + 2}_c${col + 1}`;
      const textField = form.createTextField(fieldName);
      textField.enableMultiline();
      textField.setText(safeData[row] && safeData[row][col] ? safeData[row][col] : "");
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

// Implemente a função para Template2 conforme sugerido antes

export async function generateEditablePdfTemplate2({ atividades, donoProcesso, objetivoProcesso, indicadores, servicosEntrada, servicoSaida, title = "Procedimento", imageBytes = null, pathFilename = "" }) {
  const { pdfDoc, page, font } = await createBasePdf(title, imageBytes, pathFilename);
  const form = pdfDoc.getForm();

  console.log("Template2 - servicosEntrada recebido:", servicosEntrada);
  console.log("Template2 - servicoSaida recebido:", servicoSaida);

  let yPos = yStart;

  // DONO DO PROCESSO
  page.drawText("DONO DO PROCESSO\n(nomeado):", { x: xStart, y: yPos, size: 12, font });
  const donoField = form.createTextField('dono_processo');
  donoField.enableMultiline();
  donoField.setText(donoProcesso || "");
  donoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // OBJETIVO DO PROCESSO
  page.drawText("OBJETIVO DO PROCESSO:", { x: xStart, y: yPos, size: 12, font });
  const objetivoField = form.createTextField('objetivo_processo');
  objetivoField.enableMultiline();
  objetivoField.setText(objetivoProcesso || "");
  objetivoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // SERVIÇOS DE ENTRADAS / SAÍDA
  page.drawText("SERVIÇOS DE ENTRADAS", { x: xStart, y: yPos, size: 12, font });
  page.drawText("SERVIÇO DE SAÍDA", { x: xStart + 320, y: yPos, size: 12, font });
  const entradaField = form.createTextField('servicos_entrada');
  entradaField.enableMultiline();
  entradaField.setText(servicosEntrada || "");
  entradaField.defaultUpdateAppearances(font);
  console.log("Campo servicos_entrada criado com valor:", servicosEntrada || "");
  entradaField.addToPage(page, { x: xStart, y: yPos - 28, width: 290, height: 48 });
  const saidaField = form.createTextField('servico_saida');
  saidaField.enableMultiline();
  saidaField.setText(servicoSaida || "");
  saidaField.defaultUpdateAppearances(font);
  console.log("Campo servico_saida criado com valor:", servicoSaida || "");
  saidaField.addToPage(page, { x: xStart + 320, y: yPos - 28, width: 230, height: 48 });
  yPos -= 88;

  // Cabeçalhos da tabela de atividades
  const headers = [
    "Principais Atividades",
    "Procedimentos Associados",
    "Requisitos ISO 9001",
    "Requisitos DGERT",
    "Requisitos EQAVET",
    "Requisitos CQCQ"
  ];

  // Desenha grid e cabeçalhos da tabela de atividades
  drawTemplate2Table(page, font, yPos, atividades, headers);

  // Campos editáveis para cada célula de atividades
  let camposY = yPos - 20; // primeira linha de dados
  for (let row = 0; row < atividades.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < atividades[row].length; col++) {
      const fieldName = `atividades_r${row + 1}_c${col + 1}`;
      const textField = form.createTextField(fieldName);
      textField.setText(atividades[row][col] || "");
      textField.addToPage(page, { x: xPos + 2, y: camposY + 2, width: colWidthTemplate2[col] - 4, height: 16 });
      xPos += colWidthTemplate2[col];
    }
    camposY -= 20;
  }

  // Indicadores
  let indicadoresY = camposY - 32;
  page.drawText("Indicadores de monitorização do processo", { x: xStart, y: indicadoresY, size: 12, font });
  indicadoresY -= 22;
  
  // Criar os 3 campos de indicadores
  const indicadorFields = ['indicadores_r1', 'indicadores_r2', 'indicadores_r3'];
  indicadorFields.forEach((fieldName) => {
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(indicadores[fieldName] || "");
    textField.addToPage(page, { x: xStart, y: indicadoresY, width: 550, height: 28 });
    indicadoresY -= 32;
  });

  return await pdfDoc.save();
}

// Função para gerar PDF não editável do Template 2
export async function generateNonEditablePdfTemplate2(atividades, donoProcesso, objetivoProcesso, indicadores, servicosEntrada, servicoSaida, title = "Procedimento", imageBytes = null, pathFilename = "") {
  const { pdfDoc, page, font } = await createBasePdf(title, imageBytes, pathFilename);

  // Validações de entrada
  const safeAtividades = Array.isArray(atividades) && atividades.length > 0 ? atividades : [['', '', '', '', '', '']];
  const safeIndicadores = Array.isArray(indicadores) && indicadores.length > 0 ? indicadores : [''];
  const safeDonoProcesso = donoProcesso || '';
  const safeObjetivoProcesso = objetivoProcesso || '';
  const safeServicosEntrada = servicosEntrada || '';
  const safeServicoSaida = servicoSaida || '';

  console.log("generateNonEditablePdfTemplate2 - dados recebidos:");
  console.log("atividades:", safeAtividades);
  console.log("donoProcesso:", safeDonoProcesso);
  console.log("objetivoProcesso:", safeObjetivoProcesso);
  console.log("indicadores:", safeIndicadores);
  console.log("servicosEntrada:", safeServicosEntrada);
  console.log("servicoSaida:", safeServicoSaida);

  // Calcula posição centralizada para as tabelas
  const pageWidth = pageSize[0];
  const tableWidth = 540;
  const xStartCentered = (pageWidth - tableWidth) / 2;

  // Usar a função utilitária para desenhar a tabela de cabeçalho do processo (centralizada)
  let yPos = drawProcessHeaderTableCentered(page, font, yStart, safeDonoProcesso, safeObjetivoProcesso, safeServicosEntrada, safeServicoSaida, xStartCentered);
  
  console.log("yPos após header:", yPos); // Debug

  // Headers da tabela de atividades
  const headers = [
    "Principais\nAtividades",
    "Procedimentos\nAssociados", 
    "Requisitos\nISO 9001",
    "Requisitos\nDGERT",
    "Requisitos\nEQAVET",
    "Requisitos\nCQCQ"
  ];

  // Desenha tabela de atividades (versão customizada para centralizada)
  const baseRowHeight = 25;
  let yPos2 = yPos - 30;

  // Calcula altura dinâmica para cada linha com base no conteúdo
  const getRowHeight = (rowData) => {
    let maxLines = 1;
    rowData.forEach((cellText, colIdx) => {
      const wrappedLines = wrapText(cellText || '', font, 8, colWidthTemplate2[colIdx] - 8);
      maxLines = Math.max(maxLines, wrappedLines.length);
    });
    return Math.max(baseRowHeight, maxLines * 10 + 10);
  };

  // Calcula alturas de todas as linhas
  const rowHeights = safeAtividades.map(row => getRowHeight(row));
  const headerHeight = 35;

  // Desenha cabeçalhos com fundo cinza
  let xPos = xStartCentered;
  headers.forEach((header, idx) => {
    // Desenha fundo do cabeçalho
    page.drawRectangle({
      x: xPos,
      y: yPos2 - headerHeight,
      width: colWidthTemplate2[idx],
      height: headerHeight,
      color: rgb(0.7, 0.7, 0.7),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Desenha texto do cabeçalho com quebra de linha
    const headerLines = header.split('\n');
    headerLines.forEach((line, lineIdx) => {
      page.drawText(line, { 
        x: xPos + 4, 
        y: yPos2 - 12 - (lineIdx * 10), 
        size: 9, 
        font,
        color: rgb(0, 0, 0),
      });
    });
    xPos += colWidthTemplate2[idx];
  });

  // Desenha dados das atividades linha por linha
  let currentY = yPos2 - headerHeight;
  
  for (let row = 0; row < safeAtividades.length; row++) {
    const rowHeight = rowHeights[row];
    let dataX = xStartCentered;
    
    // Desenha as células da linha
    for (let col = 0; col < safeAtividades[row].length; col++) {
      // Desenha retângulo da célula
      page.drawRectangle({
        x: dataX,
        y: currentY - rowHeight,
        width: colWidthTemplate2[col],
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Processa e desenha o texto com quebra de linha
      const cellText = safeAtividades[row][col] || '';
      const wrappedLines = wrapText(cellText, font, 8, colWidthTemplate2[col] - 8);
      
      wrappedLines.forEach((line, lineIdx) => {
        if (lineIdx < 8) { // Limita a 8 linhas por célula
          page.drawText(line, {
            x: dataX + 4,
            y: currentY - 15 - (lineIdx * 10),
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
        }
      });
      
      dataX += colWidthTemplate2[col];
    }
    currentY -= rowHeight;
  }

  yPos = currentY;

  // Desenha indicadores
  yPos -= 50;
  
  // Header da tabela de indicadores
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - 25,
    width: 540,
    height: 25,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  page.drawText("Indicadores de monitorização do processo", {
    x: xStartCentered + 10,
    y: yPos - 15,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  
  yPos -= 25;
  
  // Desenha indicadores com altura dinâmica
  const processedIndicadores = safeIndicadores.slice(0, 10); // Limita a 10 indicadores
  processedIndicadores.forEach((indicador, idx) => {
    const text = (indicador || '').toString().trim();
    if (text && text !== 'testestesteste' && !text.includes('teste')) { // Filtro de segurança
      const lines = wrapText(text, font, 9, 520);
      const indicadorHeight = Math.max(30, lines.length * 12 + 15);
      
      // Desenha a célula do indicador
      page.drawRectangle({
        x: xStartCentered,
        y: yPos - indicadorHeight,
        width: 540,
        height: indicadorHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Desenha o texto do indicador
      let textY = yPos - 15;
      lines.slice(0, 10).forEach((line, lineIdx) => { // Limita a 10 linhas por indicador
        page.drawText(line, {
          x: xStartCentered + 10,
          y: textY - (lineIdx * 12),
          size: 9,
          font,
          color: rgb(0, 0, 0),
        });
      });
      
      yPos -= indicadorHeight;
    }
  });

  return await pdfDoc.save();
}

// Função principal para gerar PDF não editável
export async function generateNonEditablePdf(data, headers, dataObs, title = "Procedimento", imageBytes = null, pathFilename = "") {
  const { pdfDoc, page: firstPage, font } = await createBasePdf(title, imageBytes, pathFilename);

  // Validações de entrada
  const safeData = Array.isArray(data) && data.length > 0 ? data : [['', '', '', '', '']];
  const safeHeaders = Array.isArray(headers) && headers.length > 0 ? headers : ['', '', '', '', ''];
  const safeDataObs = Array.isArray(dataObs) && dataObs.length > 0 ? dataObs : [['']];
  

  // Calcule a altura real da tabela de observações
  const fontSize = 6;
  const maxWidth = obsColWidth[0] - 8;
  const lineHeight = fontSize + 2;
  const obsDataForHeight = Array.from({ length: Math.max(5, safeDataObs.length) }, (_, i) =>
    Array.isArray(safeDataObs[i]) ? safeDataObs[i] : [""]
  );
  const rowHeightsObs = obsDataForHeight.map(row => {
    const text = (row[0] || '').toString();
    const lines = wrapText(text, font, fontSize, maxWidth);
    const height = Math.max(obsRowHeight, lines.length * lineHeight + 16);
    return isNaN(height) ? obsRowHeight : height;
  });
  const obsTableHeightReal = rowHeightsObs.reduce((a, b) => (isNaN(a) ? 0 : a) + (isNaN(b) ? 0 : b), 0);

  // Desenha tabela de observações na primeira página COM headers cinza
  drawObsTableWithHeaders(firstPage, font, safeDataObs);

  // --- Quebra de texto e altura dinâmica das linhas ---
  const maxWidths = colWidths.map(w => w - 8);

  // Função para remover emojis e caracteres Unicode que não são suportados pela fonte padrão
  function removeEmojis(text) {
    // Remove emojis e outros caracteres Unicode não suportados
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  }

  // Calcula as linhas quebradas e alturas de cada linha
  const wrappedData = safeData.map(row =>
    row.map((cell, col) => {
      const cellText = (cell || '').toString();
      
      // Se é um link de vídeo, usa título + URL para calcular quebras
      let textForWrapping = cellText;
      if (cellText.startsWith('[VIDEO]') && cellText.includes('||')) {
        const parts = cellText.split('||');
        const title = parts[0].replace('[VIDEO] ', '').trim();
        const url = parts[1];
        textForWrapping = `${title} (${url})`; // Formato final que será exibido
      } else {
        textForWrapping = removeEmojis(cellText); // Remove emojis de texto normal
      }
      
      const maxWidth = maxWidths[col] || 100;
      return wrapText(textForWrapping, font, fontSize, maxWidth);
    })
  );
  const rowHeightsDynamic = wrappedData.map(
    row => {
      const heights = row.map(lines => {
        const height = lines.length * lineHeight + 16;
        return isNaN(height) ? 50 : height;
      });
      const maxHeight = Math.max(...heights, 50);
      return isNaN(maxHeight) ? 50 : maxHeight;
    }
  );
  rowHeightsDynamic.unshift(50); // header
  

  // Parâmetros de página
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const marginBottom = 25;

  // Posição inicial da tabela principal
  let yPos = yStart - obsTableHeightReal - spaceBetweenTables;
  let page = firstPage;
  let rowIndex = 0;
  let isFirstPage = true;

  // Função para desenhar headers
  function drawTableHeaders(page, y, headerHeight) {
    const headerFontSize = 8; // Tamanho da fonte específico para os cabeçalhos
    const headerLineHeight = 11;
    let xPos = xStart;
    safeHeaders.forEach((header, col) => {
      const colWidth = colWidths[col] || 100;
      
      // Desenha fundo cinza do header
      page.drawRectangle({
        x: xPos,
        y: y - headerHeight,
        width: colWidth,
        height: headerHeight,
        color: rgb(0.7, 0.7, 0.7),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      const lines = (header || "").split('\n');
      const totalTextHeight = lines.length * headerLineHeight;
      let startY = y - ((headerHeight - totalTextHeight) / 2) - headerFontSize;
      lines.forEach((line, idx) => {
        const textWidth = font.widthOfTextAtSize(line, headerFontSize);
        const textX = xPos + (colWidth - textWidth) / 2;
        const textY = startY - idx * headerLineHeight;
        page.drawText(line, {
          x: textX,
          y: textY,
          size: headerFontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
      xPos += colWidths[col] || 100;
    });
  }

  // Função para desenhar linhas horizontais e verticais da tabela
  function drawTableGrid(page, yStartTable, rowHeights, numRows, drawTopLine = true) {
    let y = yStartTable;
    // Desenha linhas horizontais
    for (let i = 0; i <= numRows; i++) {
      if (i === 0 && !drawTopLine) {
        y -= rowHeights[i] || 0;
        continue;
      }
      page.drawLine({
        start: { x: xStart, y: y },
        end: { x: xStart + totalWidth, y: y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      if (i < numRows) {
        y -= rowHeights[i] || 0;
      }
    }
    // Desenha linhas verticais
    let xPos = xStart;
    const totalVerticalHeight = rowHeights.slice(0, numRows + (drawTopLine ? 1 : 0)).reduce((a, b) => a + b, 0);
    for (let j = 0; j <= colWidths.length; j++) {
      page.drawLine({
        start: { x: xPos, y: yStartTable },
        end: { x: xPos, y: yStartTable - totalVerticalHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      if (j < colWidths.length) {
        xPos += colWidths[j];
      }
    }
  }

  // Desenha a tabela principal, quebrando para nova página se necessário
  while (rowIndex < safeData.length) {
    // Calcular espaço disponível nesta página
    let availableHeight;
    if (isFirstPage) {
      availableHeight = yPos - marginBottom;
    } else {
      yPos = yStart;
      availableHeight = yPos - marginBottom;
    }

    // Quantas linhas cabem nesta página?
    let rowsThisPage = 0;
    let heightSum = isFirstPage ? rowHeightsDynamic[0] : 0; // header só na primeira página
    while (
      rowIndex + rowsThisPage < safeData.length &&
      heightSum + rowHeightsDynamic[rowIndex + rowsThisPage + 1] <= availableHeight
    ) {
      heightSum += rowHeightsDynamic[rowIndex + rowsThisPage + 1];
      rowsThisPage++;
    }

    // Desenha grid e headers
    const rowsToDraw = rowsThisPage > 0 ? rowsThisPage : 1;
    if (isFirstPage) {
      drawTableGrid(page, yPos, [rowHeightsDynamic[0], ...rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw)], rowsToDraw, true);
      drawTableHeaders(page, yPos, rowHeightsDynamic[0]);
    } else {
      drawTableGrid(page, yPos, rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw), rowsToDraw, false);
    }

    // Desenha dados
    let yData = yPos - (isFirstPage ? rowHeightsDynamic[0] : 0);
    for (let i = 0; i < rowsToDraw; i++) {
      let xPos = xStart;
      const row = rowIndex + i;
      
      // Validação adicional para garantir que os dados existem
      if (!safeData[row] || !Array.isArray(safeData[row])) {
        console.warn(`Linha ${row} não encontrada ou não é array:`, safeData[row]);
        continue;
      }
      
      if (!wrappedData[row] || !Array.isArray(wrappedData[row])) {
        console.warn(`wrappedData linha ${row} não encontrada ou não é array:`, wrappedData[row]);
        continue;
      }
      
      for (let col = 0; col < safeData[row].length; col++) {
        const lines = wrappedData[row][col];
        if (!Array.isArray(lines)) {
          console.warn(`lines não é array para row ${row}, col ${col}:`, lines);
          continue;
        }
        
        // Verifica se é um link de vídeo UMA VEZ por célula
        const originalCellText = safeData[row][col] || '';
        const isVideoLink = originalCellText.startsWith('[VIDEO]') && originalCellText.includes('||');
        
        let textY = yData - 8;
        
        if (isVideoLink) {
          // Para links de vídeo, desenha apenas o título
          const parts = originalCellText.split('||');
          const title = parts[0].replace('[VIDEO] ', '').trim();
          const url = parts[1] || ''; // Extrai a URL
          
          // Desenha apenas o título limpo como link
          const textWidth = font.widthOfTextAtSize(title, fontSize);
          
          // Desenha o texto em azul para indicar que é um link
          page.drawText(title, {
            x: xPos + 4,
            y: textY,
            size: fontSize,
            font,
            color: rgb(0, 0, 1), // Azul para links
            maxWidth: maxWidths[col] || 100,
          });
          
          // Adiciona sublinhado para indicar visualmente que é um link
          const underlineY = textY - 2;
          page.drawLine({
            start: { x: xPos + 4, y: underlineY },
            end: { x: xPos + 4 + Math.min(textWidth, maxWidths[col] || 100), y: underlineY },
            thickness: 0.5,
            color: rgb(0, 0, 1),
          });
          
          // Tenta criar anotação de link clicável usando API do pdf-lib
          try {
            // Cria uma anotação de link usando a API correta do pdf-lib
            const linkRect = [
              xPos + 4,
              textY - 4,
              xPos + 4 + Math.min(textWidth, maxWidths[col] || 100),
              textY + fontSize + 2
            ];
            
            // Cria o dicionário da anotação
            const linkAnnot = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: linkRect,
              A: {
                Type: 'Action',
                S: 'URI',
                URI: url
              },
              Border: [0, 0, 0],
              F: 4
            });
            
            // Adiciona a anotação à página
            const pageRef = page.ref;
            const pageDict = pdfDoc.context.lookup(pageRef);
            
            // Obtém ou cria array de anotações
            let annotsRef = pageDict.get(PDFName.of('Annots'));
            if (!annotsRef) {
              const annotsArray = pdfDoc.context.obj([linkAnnot]);
              pageDict.set(PDFName.of('Annots'), annotsArray);
            } else {
              const annotsArray = pdfDoc.context.lookup(annotsRef);
              if (annotsArray instanceof PDFArray) {
                annotsArray.push(linkAnnot);
              }
            }
            
            console.log(`✅ Link clicável criado: "${title}" -> ${url}`);
          } catch (error) {
            console.warn('⚠️ Falha ao criar link clicável, mantendo apenas visual:', error);
            console.log(`📝 URL do vídeo: ${url}`);
          }
        } else {
          // Para texto normal, processa todas as linhas
          for (let l = 0; l < lines.length; l++) {
            if (lines[l] && typeof lines[l] === 'string') {
              const cleanText = removeEmojis(lines[l]);
              page.drawText(cleanText, {
                x: xPos + 4,
                y: textY - l * lineHeight,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
                maxWidth: maxWidths[col] || 100,
              });
            }
          }
        }
        xPos += colWidths[col];
      }
      yData -= rowHeightsDynamic[row + 1];
    }

    rowIndex += rowsToDraw;

    // Se ainda há linhas, cria nova página e continua
    if (rowIndex < safeData.length) {
      page = pdfDoc.addPage(pageSize);
      yPos = yStart;
      isFirstPage = false;
    }
  }

  return await pdfDoc.save();
}

/**
 * @param {string} mainTableHtml
 * @param {string} obsTableHtml
 * @returns {Promise<Uint8Array>}
 */
export async function generateNonEditablePdfFromHtml(mainTableHtml, obsTableHtml, title = "Procedimento", imageBytes = null, pathFilename = "") {
  const parser = new DOMParser();
  // Função para extrair texto de uma célula, convertendo <br> em \n
  function getCellTextWithBreaks(cell) {
    let text = "";
    cell.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        text += node.nodeValue.replace(/<br\s*\/?>/gi, "\n");
      } else if (node.nodeName === "BR") {
        text += "\n";
      } else if (node.nodeType === 1) {
        text += getCellTextWithBreaks(node);
      }
    });
    return text;
  }

  const htmlTableToArray = (html) => {
    const doc = parser.parseFromString(html, "text/html");
    const rows = [];
    doc.querySelectorAll("tr").forEach(tr => {
      const cells = [];
      tr.querySelectorAll("th,td").forEach(cell => {
        cells.push(getCellTextWithBreaks(cell));
      });
      rows.push(cells);
    });
    return rows;
  };

  const mainTableArr = htmlTableToArray(mainTableHtml);
  const obsTableArr = htmlTableToArray(obsTableHtml);

  const headers = mainTableArr[0] || [];
  const data = mainTableArr.slice(1);
  const headersObs = obsTableArr[0] || [];
  const dataObs = obsTableArr.slice(1);

  return await generateNonEditablePdf(data, headers, dataObs, title, imageBytes, pathFilename);
}

// Adicione esta função utilitária
export function drawProcessHeaderTable(page, font, yPos, donoProcesso, objetivoProcesso, servicosEntrada, servicoSaida) {
  // Larguras das colunas ajustadas
  const totalWidth = 540;
  const leftColWidth = 200;
  const rightColWidth = totalWidth - leftColWidth;
  const rowHeight = 35;
  const headerHeight = 30;
  const entradaSaidaHeight = 25;
  const contentHeight = 120;

  // DONO DO PROCESSO
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight,
    width: leftColWidth,
    height: headerHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight,
    width: rightColWidth,
    height: headerHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('DONO DO PROCESSO', {
    x: xStart + 8,
    y: yPos - 12,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('(nomeado):', {
    x: xStart + 8,
    y: yPos - 24,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  
  const donoWrapped = wrapText(donoProcesso || '', font, 10, rightColWidth - 16);
  donoWrapped.forEach((line, idx) => {
    page.drawText(line, {
      x: xStart + leftColWidth + 8,
      y: yPos - 15 - (idx * 12),
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  });

  // OBJETIVO DO PROCESSO
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight,
    width: leftColWidth,
    height: rowHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight,
    width: rightColWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('OBJETIVO DO PROCESSO:', {
    x: xStart + 8,
    y: yPos - headerHeight - 20,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  
  const objetivoWrapped = wrapText(objetivoProcesso || '', font, 10, rightColWidth - 16);
  objetivoWrapped.forEach((line, idx) => {
    page.drawText(line, {
      x: xStart + leftColWidth + 8,
      y: yPos - headerHeight - 15 - (idx * 12),
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Cabeçalho
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: leftColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: rightColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('SERVIÇOS DE ENTRADAS', {
    x: xStart + 8,
    y: yPos - headerHeight - rowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('SERVIÇO DE SAÍDA', {
    x: xStart + leftColWidth + 8,
    y: yPos - headerHeight - rowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Conteúdo
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: leftColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: rightColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Texto dos serviços com quebra de linha adequada
  let fontSize = 9;
  
  const entradaWrapped = wrapText(servicosEntrada || '', font, fontSize, leftColWidth - 16);
  const saidaWrapped = wrapText(servicoSaida || '', font, fontSize, rightColWidth - 16);
  
  let entradaY = yPos - headerHeight - rowHeight - entradaSaidaHeight - 15;
  let saidaY = entradaY;
  
  entradaWrapped.forEach((line, idx) => {
    if (entradaY - (idx * 12) > yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight + 5) {
      page.drawText(line, {
        x: xStart + 8,
        y: entradaY - (idx * 12),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  });
  
  saidaWrapped.forEach((line, idx) => {
    if (saidaY - (idx * 12) > yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight + 5) {
      page.drawText(line, {
        x: xStart + leftColWidth + 8,
        y: saidaY - (idx * 12),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  });

  // Retorne a nova posição Y para continuar desenhando abaixo
  return yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight - 25;
}

// Função centralizada para o header do processo
export function drawProcessHeaderTableCentered(page, font, yPos, donoProcesso, objetivoProcesso, servicosEntrada, servicoSaida, xStartCentered) {
  // Larguras das colunas ajustadas
  const totalWidth = 540;
  const leftColWidth = 200;
  const rightColWidth = totalWidth - leftColWidth;
  const rowHeight = 35;
  const headerHeight = 30;
  const entradaSaidaHeight = 25;
  const contentHeight = 120;

  // DONO DO PROCESSO
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - headerHeight,
    width: leftColWidth,
    height: headerHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight,
    width: rightColWidth,
    height: headerHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('DONO DO PROCESSO', {
    x: xStartCentered + 8,
    y: yPos - 12,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('(nomeado):', {
    x: xStartCentered + 8,
    y: yPos - 24,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  
  const donoWrapped = wrapText(donoProcesso || '', font, 10, rightColWidth - 16);
  donoWrapped.forEach((line, idx) => {
    page.drawText(line, {
      x: xStartCentered + leftColWidth + 8,
      y: yPos - 15 - (idx * 12),
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  });

  // OBJETIVO DO PROCESSO
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - headerHeight - rowHeight,
    width: leftColWidth,
    height: rowHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - rowHeight,
    width: rightColWidth,
    height: rowHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('OBJETIVO DO PROCESSO:', {
    x: xStartCentered + 8,
    y: yPos - headerHeight - 20,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  
  const objetivoWrapped = wrapText(objetivoProcesso || '', font, 10, rightColWidth - 16);
  objetivoWrapped.forEach((line, idx) => {
    page.drawText(line, {
      x: xStartCentered + leftColWidth + 8,
      y: yPos - headerHeight - 15 - (idx * 12),
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Cabeçalho
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: leftColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight,
    width: rightColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('SERVIÇOS DE ENTRADAS', {
    x: xStartCentered + 8,
    y: yPos - headerHeight - rowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('SERVIÇO DE SAÍDA', {
    x: xStartCentered + leftColWidth + 8,
    y: yPos - headerHeight - rowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Conteúdo
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: leftColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight,
    width: rightColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Texto dos serviços com quebra de linha adequada
  let fontSize = 9;
  
  const entradaWrapped = wrapText(servicosEntrada || '', font, fontSize, leftColWidth - 16);
  const saidaWrapped = wrapText(servicoSaida || '', font, fontSize, rightColWidth - 16);
  
  let entradaY = yPos - headerHeight - rowHeight - entradaSaidaHeight - 15;
  let saidaY = entradaY;
  
  entradaWrapped.forEach((line, idx) => {
    if (entradaY - (idx * 12) > yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight + 5) {
      page.drawText(line, {
        x: xStartCentered + 8,
        y: entradaY - (idx * 12),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  });
  
  saidaWrapped.forEach((line, idx) => {
    if (saidaY - (idx * 12) > yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight + 5) {
      page.drawText(line, {
        x: xStartCentered + leftColWidth + 8,
        y: saidaY - (idx * 12),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  });

  // Retorne a nova posição Y para continuar desenhando abaixo
  return yPos - headerHeight - rowHeight - entradaSaidaHeight - contentHeight - 25;
}
