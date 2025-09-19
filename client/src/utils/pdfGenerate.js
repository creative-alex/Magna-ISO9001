import { createBasePdf, wrapText, pageSize, xStart, yStart } from './pdfBase';
import { drawTableLines, drawHeaders, drawObsTable, getObsRows, colWidths, obsColWidth, obsRowHeight, spaceBetweenTables, drawTemplate2Table, colWidthTemplate2 } from './pdfTables';
import { drawObsTableWithHeaders, calculateObsTableHeight } from './pdfObsTable';
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
  title = "", // Added missing title parameter
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

  // Use obsRows dinâmico e a nova função de cálculo de altura
  const obsRows = getObsRows(dataObs);
  const obsTableHeightReal = calculateObsTableHeight(dataObs, font);
  
  console.log("obsRows:", obsRows);
  console.log("obsTableHeightReal:", obsTableHeightReal);
  console.log("data.length:", safeData.length);
  console.log("yStart:", yStart);
  console.log("spaceBetweenTables:", spaceBetweenTables);

  // Desenha a tabela de observações usando a função existente (sem headers cinza para editável)
  drawObsTable(page, font, dataObs);

  let yObs = yStart;
  const fontSize = 8;  // Fonte para ser igual ao PDF não editável
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
  
  // Criar campos de formulário para a tabela de observações
  for (let row = 0; row < obsRows; row++) {
    const fieldName = `table1_r${row + 1}`;
    const textField = form.createTextField(fieldName);
    textField.enableMultiline();
    textField.setText(dataObs && dataObs[row] ? dataObs[row][0] : "");
    
    // Add to page first, then set appearance
    textField.addToPage(page, {
      x: xStart + 2,
      y: yObs - rowHeightsObs[row] + 2,
      width: obsColWidth[0] - 4,
      height: rowHeightsObs[row] - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(1, 1, 1),
      border: undefined,
    });
    
    // Set appearance and font size after adding to page
    textField.updateAppearances(font);
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

  let yPos = yStart - obsTableHeightReal - spaceBetweenTables;
  console.log("yPos inicial para tabela principal:", yPos);
  console.log("yStart:", yStart, "obsTableHeightReal:", obsTableHeightReal, "spaceBetweenTables:", spaceBetweenTables);
  
  for (let row = 0; row < safeData.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < 5; col++) {
      const fieldName = `table2_r${row + 2}_c${col + 1}`;
      const textField = form.createTextField(fieldName);
      textField.enableMultiline();
      textField.setText(safeData[row] && safeData[row][col] ? safeData[row][col] : "");
      
      // Add to page first, then set appearance
      textField.addToPage(page, {
        x: xPos + 2,
        y: yPos - rowHeights[row + 1] + 2,
        width: colWidths[col] - 4,
        height: rowHeights[row + 1] - 4,
        textColor: rgb(0, 0, 0),
        backgroundColor: rgb(1, 1, 1),
        border: undefined,
      });
      
      // Set appearance and font size after adding to page
      textField.updateAppearances(font);
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
  donoField.updateAppearances(font);
  donoField.setFontSize(10);
  donoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // OBJETIVO DO PROCESSO
  page.drawText("OBJETIVO DO PROCESSO:", { x: xStart, y: yPos, size: 12, font });
  const objetivoField = form.createTextField('objetivo_processo');
  objetivoField.enableMultiline();
  objetivoField.setText(objetivoProcesso || "");
  objetivoField.updateAppearances(font);
  objetivoField.setFontSize(10);
  objetivoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // SERVIÇOS DE ENTRADAS / SAÍDA
  page.drawText("SERVIÇOS DE ENTRADAS", { x: xStart, y: yPos, size: 12, font });
  page.drawText("SERVIÇO DE SAÍDA", { x: xStart + 320, y: yPos, size: 12, font });
  const entradaField = form.createTextField('servicos_entrada');
  entradaField.enableMultiline();
  entradaField.setText(servicosEntrada || "");
  entradaField.updateAppearances(font);
  entradaField.setFontSize(10);
  console.log("Campo servicos_entrada criado com valor:", servicosEntrada || "");
  entradaField.addToPage(page, { x: xStart, y: yPos - 28, width: 290, height: 48 });
  const saidaField = form.createTextField('servico_saida');
  saidaField.enableMultiline();
  saidaField.setText(servicoSaida || "");
  saidaField.updateAppearances(font);
  saidaField.setFontSize(10);
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
      textField.updateAppearances(font);
      textField.setFontSize(8);
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
    textField.updateAppearances(font);
    textField.setFontSize(10);
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

  console.log("🎯 generateNonEditablePdfTemplate2 - dados recebidos:");
  console.log("📋 atividades:", safeAtividades);
  console.log("👤 donoProcesso:", safeDonoProcesso);
  console.log("🎯 objetivoProcesso (IMPORTANTE):", safeObjetivoProcesso);
  console.log("📊 indicadores:", safeIndicadores);
  console.log("📥 servicosEntrada:", safeServicosEntrada);
  console.log("📤 servicoSaida:", safeServicoSaida);
  
  // Validação adicional para objetivos
  if (!safeObjetivoProcesso || safeObjetivoProcesso.trim() === '') {
    console.warn("⚠️ AVISO: Objetivo do processo está vazio ou indefinido!");
  }

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
          // Calcula a largura disponível para o texto
          const availableWidth = colWidthTemplate2[col] - 8; // 4px de margem de cada lado
          
          // Verifica se o texto cabe na largura disponível
          const textWidth = font.widthOfTextAtSize(line, 8);
          
          if (textWidth <= availableWidth) {
            // Texto cabe normalmente
            page.drawText(line, {
              x: dataX + 4,
              y: currentY - 15 - (lineIdx * 10),
              size: 8,
              font,
              color: rgb(0, 0, 0),
            });
          } else {
            // Texto muito longo, trunca com reticências
            let truncatedText = line;
            while (font.widthOfTextAtSize(truncatedText + '...', 8) > availableWidth && truncatedText.length > 0) {
              truncatedText = truncatedText.slice(0, -1);
            }
            
            page.drawText(truncatedText + (truncatedText.length < line.length ? '...' : ''), {
              x: dataX + 4,
              y: currentY - 15 - (lineIdx * 10),
              size: 8,
              font,
              color: rgb(0, 0, 0),
            });
          }
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
      
      // Desenha o texto do indicador linha por linha
      lines.forEach((line, lineIdx) => {
        if (lineIdx < 10) { // Limita a 10 linhas por indicador
          // Calcula a largura disponível para o texto
          const availableWidth = 520; // 540 - 20 (10px de margem de cada lado)
          
          // Verifica se o texto cabe na largura disponível
          const textWidth = font.widthOfTextAtSize(line, 9);
          
          if (textWidth <= availableWidth) {
            // Texto cabe normalmente
            page.drawText(line, {
              x: xStartCentered + 10,
              y: yPos - 15 - (lineIdx * 12),
              size: 9,
              font,
              color: rgb(0, 0, 0),
            });
          } else {
            // Texto muito longo, trunca com reticências
            let truncatedText = line;
            while (font.widthOfTextAtSize(truncatedText + '...', 9) > availableWidth && truncatedText.length > 0) {
              truncatedText = truncatedText.slice(0, -1);
            }
            
            page.drawText(truncatedText + (truncatedText.length < line.length ? '...' : ''), {
              x: xStartCentered + 10,
              y: yPos - 15 - (lineIdx * 12),
              size: 9,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }
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
  
  // Usa a nova função centralizada para calcular a altura real da tabela de observações
  const obsTableHeightReal = calculateObsTableHeight(safeDataObs, font);

  // Desenha tabela de observações na primeira página COM headers cinza
  drawObsTableWithHeaders(firstPage, font, safeDataObs);

  // --- Quebra de texto e altura dinâmica das linhas ---
  const fontSize = 8; // Definir fontSize para uso consistente
  const lineHeight = fontSize + 2; // Definir lineHeight baseado no fontSize
  const maxWidths = colWidths.map(w => w - 8);

  // Função para remover emojis e caracteres Unicode que não são suportados pela fonte padrão
  function removeEmojis(text) {
    // Remove emojis e outros caracteres Unicode não suportados
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  }

  // Calcula as linhas quebradas e alturas de cada linha
  const wrappedData = safeData.map((row, rowIdx) =>
    row.map((cell, col) => {
      const cellText = (cell || '').toString();
      
      // Debug para documentos associados (coluna 3)
      if (col === 3 && cellText.trim() !== '') {
        console.log(`🔍 DEBUG - Documentos Associados linha ${rowIdx}:`, cellText);
      }
      
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

    console.log(`📏 Página ${isFirstPage ? '1 (primeira)' : 'nova'}: espaço disponível = ${availableHeight}`);

    // Quantas linhas cabem nesta página?
    let rowsThisPage = 0;
    let heightSum = isFirstPage ? rowHeightsDynamic[0] : 0; // header só na primeira página
    
    // Melhor lógica de verificação de espaço
    while (rowIndex + rowsThisPage < safeData.length) {
      const nextRowHeight = rowHeightsDynamic[rowIndex + rowsThisPage + 1] || 50;
      
      // Verifica se a próxima linha cabe na página com margem de segurança
      if (heightSum + nextRowHeight + 20 > availableHeight) {
        console.log(`🔄 Quebra de página necessária: altura atual ${heightSum} + próxima linha ${nextRowHeight} > disponível ${availableHeight}`);
        break;
      }
      
      heightSum += nextRowHeight;
      rowsThisPage++;
    }
    
    // Garante que pelo menos uma linha seja desenhada (evita loop infinito)
    if (rowsThisPage === 0 && rowIndex < safeData.length) {
      rowsThisPage = 1;
      console.log(`⚠️ Forçando desenho de pelo menos 1 linha na página`);
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
    
    console.log(`📊 Desenhando ${rowsToDraw} linhas a partir da linha ${rowIndex}`);
    
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
        
        // Debug para instruções de trabalho (coluna 4)
        if (col === 4 && originalCellText.trim()) {
          console.log(`📝 Instruções de trabalho linha ${row}:`, originalCellText);
        }
        
        if (isVideoLink) {
          // Para links de vídeo, desenha apenas o título
          const parts = originalCellText.split('||');
          const title = parts[0].replace('[VIDEO] ', '').trim();
          const url = parts[1] || ''; // Extrai a URL
          
          console.log(`🎬 Processando vídeo: ${title}`);
          
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
          // Para texto normal (incluindo instruções de trabalho), desenha as linhas quebradas
          if (originalCellText.trim()) {
            // Verifica se há conteúdo válido para desenhar
            const validLines = lines.filter(line => line && line.trim());
            
            if (validLines.length === 0) {
              console.log(`⚠️ Nenhuma linha válida para desenhar na coluna ${col}, linha ${row}`);
              return;
            }
            
            validLines.forEach((line, lineIdx) => {
              if (lineIdx < 15) { // Aumenta limite para 15 linhas por célula
                try {
                  // Verifica se o texto cabe na célula horizontalmente
                  const textWidth = font.widthOfTextAtSize(line, fontSize);
                  const availableWidth = maxWidths[col] || 100;
                  
                  if (textWidth > availableWidth) {
                    console.log(`⚠️ Texto muito largo na coluna ${col}: "${line.substring(0, 30)}..."`);
                    console.log(`   Largura do texto: ${textWidth}px, disponível: ${availableWidth}px`);
                  }
                  
                  // Calcula posição Y garantindo que não ultrapasse a célula
                  const currentY = textY - lineIdx * lineHeight;
                  const cellBottom = yData - rowHeightsDynamic[row + 1] + 4;
                  
                  if (currentY < cellBottom) {
                    console.log(`⚠️ Texto ultrapassaria a célula na linha ${lineIdx}. Parando o desenho.`);
                    return;
                  }
                  
                  page.drawText(line, {
                    x: xPos + 4,
                    y: currentY,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                    maxWidth: availableWidth,
                  });
                  
                  // Debug específico para instruções e documentos
                  if ((col === 3 || col === 4) && lineIdx === 0) {
                    console.log(`✅ Desenhado na coluna ${col === 3 ? 'Docs' : 'Instr'}, linha ${row}: "${line}"`);
                  }
                  
                } catch (textError) {
                  console.error(`❌ Erro ao desenhar texto na coluna ${col}, linha ${row}:`, textError);
                  console.log(`📝 Texto problemático: "${line}"`);
                  console.log(`� Posição: x=${xPos + 4}, y=${textY - lineIdx * lineHeight}`);
                }
              }
            });
          } else if (col === 3 || col === 4) {
            // Debug para colunas importantes (Documentos Associados e Instruções)
            console.log(`ℹ️ Célula vazia na coluna ${col === 3 ? 'Documentos Associados' : 'Instruções de Trabalho'}, linha ${row}`);
            console.log(`   Dados originais: "${originalCellText}"`);
            console.log(`   Linhas processadas:`, lines);
          }
        }
        xPos += colWidths[col];
      }
      yData -= rowHeightsDynamic[row + 1];
    }

    // Avança para próximas linhas
    rowIndex += rowsToDraw;
    
    console.log(`✅ Desenhadas ${rowsToDraw} linhas. Próximo índice: ${rowIndex}/${safeData.length}`);
    
    // Se ainda há linhas para desenhar, criar nova página
    if (rowIndex < safeData.length) {
      console.log(`📄 Criando nova página para continuar tabela`);
      const newPage = pdfDoc.addPage([pageSize[0], pageSize[1]]);
      page = newPage;
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
    
    // Verifica se é uma célula com componente especial (DocumentosAssociados ou InstrucoesTrabalho)
    const hasSpecialComponent = cell.querySelector('.documentos-associados-container') || 
                               cell.querySelector('.instrucoes-trabalho-container');
    
    if (hasSpecialComponent) {
      // Para componentes especiais, procura por input/textarea que contém o valor real
      const hiddenInput = cell.querySelector('input[type="hidden"]') || 
                         cell.querySelector('input[value]') ||
                         cell.querySelector('textarea');
      
      if (hiddenInput && hiddenInput.value !== undefined) {
        text = hiddenInput.value || '';
        console.log("🔍 DEBUG - Valor extraído de componente especial:", text);
      } else {
        // Fallback: procura por atributos data-value ou similar
        const containerEl = cell.querySelector('[data-value]') || 
                           cell.querySelector('[data-current-value]');
        if (containerEl) {
          text = containerEl.getAttribute('data-value') || 
                 containerEl.getAttribute('data-current-value') || '';
          console.log("🔍 DEBUG - Valor extraído de data-attribute:", text);
        } else {
          // Se não encontrar o valor, tenta extrair texto visível
          text = cell.textContent || cell.innerText || '';
          console.log("🔍 DEBUG - Texto extraído como fallback:", text);
        }
      }
    } else {
      // Para células normais
      cell.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          text += node.nodeValue.replace(/<br\s*\/?>/gi, "\n");
        } else if (node.nodeName === "BR") {
          text += "\n";
        } else if (node.nodeType === 1) {
          text += getCellTextWithBreaks(node);
        }
      });
    }
    
    console.log("🔍 DEBUG - getCellTextWithBreaks resultado:", text);
    return text;
  }

  const htmlTableToArray = (html) => {
    console.log("🔍 DEBUG - HTML recebido para conversão:", html.substring(0, 500));
    const doc = parser.parseFromString(html, "text/html");
    const rows = [];
    
    // Verifica se é a tabela de observações (Template 1)
    if (html.includes('tabela-observacoes')) {
      console.log("🔍 DEBUG - Processando tabela de observações do Template 1");
      
      // Para a tabela de observações, pega apenas as linhas com textarea (conteúdo das seções)
      const contentRows = doc.querySelectorAll("tr");
      const sections = [];
      
      contentRows.forEach((tr, rowIdx) => {
        const textarea = tr.querySelector("textarea");
        if (textarea && textarea.value !== undefined) {
          const sectionContent = textarea.value || '';
          console.log(`📝 Seção ${sections.length + 1} extraída:`, sectionContent.substring(0, 100) + "...");
          sections.push([sectionContent]);
        }
      });
      
      // Garante que temos exatamente 5 seções na ordem correta
      while (sections.length < 5) {
        sections.push(['']);
      }
      
      console.log("🔍 DEBUG - Seções finais:", sections.map((s, i) => `${i+1}: ${s[0] ? s[0].substring(0, 30) : 'vazio'}...`));
      return sections;
    } else {
      // Para outras tabelas (tabela principal)
      doc.querySelectorAll("tr").forEach((tr, rowIdx) => {
        const cells = [];
        tr.querySelectorAll("th,td").forEach((cell, colIdx) => {
          const cellText = getCellTextWithBreaks(cell);
          if (colIdx === 4) { // Coluna de instruções
            console.log(`🔍 DEBUG - Linha ${rowIdx}, Coluna ${colIdx} (Instruções):`, cellText);
          }
          if (colIdx === 3) { // Coluna de documentos associados
            console.log(`🔍 DEBUG - Linha ${rowIdx}, Coluna ${colIdx} (Documentos):`, cellText);
          }
          cells.push(cellText);
        });
        rows.push(cells);
      });
      return rows;
    }
  };

  const mainTableArr = htmlTableToArray(mainTableHtml);
  const obsTableArr = htmlTableToArray(obsTableHtml);

  const headers = mainTableArr[0] || [];
  const data = mainTableArr.slice(1);
  
  // Para a tabela de observações, já temos o formato correto
  const dataObs = obsTableArr;
  
  console.log("🔍 DEBUG - Dados finais para PDF:");
  console.log("  Headers:", headers);
  console.log("  Data (primeiras 2 linhas):", data.slice(0, 2));
  console.log("  DataObs:", dataObs.map((obs, i) => `${i+1}: ${obs[0] ? obs[0].substring(0, 40) : 'vazio'}...`));

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
