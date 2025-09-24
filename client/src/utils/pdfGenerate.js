import { createBasePdf, wrapText, pageSize, xStart, yStart, addHeader } from './pdfBase';
import { drawTableLines, drawHeaders, drawObsTable, getObsRows, colWidths, obsColWidth, obsRowHeight, spaceBetweenTables, drawTemplate2Table, colWidthTemplate2 } from './pdfTables';
import { drawObsTableWithHeaders, calculateObsTableHeight } from './pdfObsTable';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, PDFDict } from 'pdf-lib';

// Helper function to create text field with proper appearance
function createTextFieldWithAppearance(form, fieldName, text, font, fontSize = 10, multiline = false) {
  const textField = form.createTextField(fieldName);
  if (multiline) {
    textField.enableMultiline();
  }
  textField.setText(text || "");
  
  // Try to set appearance safely with multiple fallback strategies
  try {
    // First try: Set font size, then update appearances
    textField.setFontSize(fontSize);
    textField.updateAppearances(font);
  } catch (error) {
    console.warn(`Strategy 1 failed for field ${fieldName}:`, error);
    try {
      // Second try: Just update appearances without setting font size
      textField.updateAppearances(font);
    } catch (e) {
      console.warn(`Strategy 2 failed for field ${fieldName}:`, e);
      // Final fallback: Do nothing, field will use default appearance
      console.warn(`Using default appearance for field ${fieldName}`);
    }
  }
  
  return textField;
}

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
    return await generateEditablePdfTemplate1(data, headers, dataObs, headersObs, title, imageBytes, pathFilename, 400);
  }
}


// Renomeie a função antiga para Template1
export async function generateEditablePdfTemplate1(data, headers, dataObs, headersObs, title = "Procedimento", imageBytes = null, pathFilename = "", maxHeightForFirstTable = 400) {
  const { pdfDoc, page, font } = await createBasePdf(title, imageBytes, pathFilename);
  const form = pdfDoc.getForm();
  console.log("🎯 generateEditablePdf recebeu pathFilename:", pathFilename); 

  // Validate and ensure data is an array
  const safeData = Array.isArray(data) ? data : [];
  const safeHeaders = Array.isArray(headers) ? headers : [];

  // Use obsRows dinâmico e a nova função de cálculo de altura
  const obsRows = getObsRows(dataObs);
  const obsTableHeightReal = calculateObsTableHeight(dataObs, font);
  
  // Configuração do limiar de altura para quebra de página
  // Se a primeira tabela (observações) exceder esta altura, a segunda tabela vai para nova página
  const pageBottomMargin = 50; // Margem inferior da página
  const shouldBreakPage = obsTableHeightReal > maxHeightForFirstTable;
  
  console.log("obsRows:", obsRows);
  console.log("obsTableHeightReal:", obsTableHeightReal);
  console.log("maxHeightForFirstTable:", maxHeightForFirstTable);
  console.log("shouldBreakPage:", shouldBreakPage);
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
    const textField = createTextFieldWithAppearance(form, fieldName, dataObs && dataObs[row] ? dataObs[row][0] : "", font, 8, true);
    
    // Add to page
    textField.addToPage(page, {
      x: xStart + 2,
      y: yObs - rowHeightsObs[row] + 2,
      width: obsColWidth[0] - 4,
      height: rowHeightsObs[row] - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(1, 1, 1),
      border: undefined,
    });
    
    yObs -= rowHeightsObs[row];
  }

  // Determina se precisa criar nova página para segunda tabela
  let currentPage = page;
  let currentYPos = yStart - obsTableHeightReal - spaceBetweenTables;
  
  if (shouldBreakPage) {
    // Cria nova página para a segunda tabela
    currentPage = pdfDoc.addPage(pageSize);
    
    // Adiciona cabeçalho na nova página se necessário
    if (imageBytes || pathFilename) {
      await addHeader(currentPage, font, title, imageBytes, pathFilename);
    }
    
    currentYPos = yStart; // Reset da posição Y para o topo da nova página
    console.log("🔄 Nova página criada para segunda tabela. yPos resetado para:", currentYPos);
  }

  // Gere dinamicamente os rowHeights para a tabela principal
  const rowHeights = Array(safeData.length + 1).fill(50); // +1 para o header

  // Desenha tabela principal na página apropriada
  // Primeiro desenha as linhas da tabela
  drawTableLines(currentPage, shouldBreakPage ? 0 : obsTableHeightReal, shouldBreakPage ? yStart : null, rowHeights);
  
  // DEPOIS desenha os headers com fundo cinza por cima (igual Template 2)
  let xPos = xStart;
  const yHeaders = shouldBreakPage ? yStart : (yStart - obsTableHeightReal - spaceBetweenTables);
  const headerHeight = rowHeights[0] || 50;
  
  safeHeaders.forEach((header, col) => {
    const colWidth = colWidths[col] || 100;
    
    // Quadrado cinza do header (igual Template 2)
    currentPage.drawRectangle({
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

      currentPage.drawText(line, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });

    xPos += colWidth;
  });

  let yPos = shouldBreakPage ? yStart : (yStart - obsTableHeightReal - spaceBetweenTables);
  console.log("yPos inicial para tabela principal:", yPos);
  console.log("yStart:", yStart, "obsTableHeightReal:", obsTableHeightReal, "spaceBetweenTables:", spaceBetweenTables);
  
  for (let row = 0; row < safeData.length; row++) {
    let xPos = xStart;
    for (let col = 0; col < 5; col++) {
      const fieldName = `table2_r${row + 2}_c${col + 1}`;
      const textField = createTextFieldWithAppearance(form, fieldName, safeData[row] && safeData[row][col] ? safeData[row][col] : "", font, 8, true);
      
      // Add to page
      textField.addToPage(currentPage, {
        x: xPos + 2,
        y: yPos - rowHeights[row + 1] + 2,
        width: colWidths[col] - 4,
        height: rowHeights[row + 1] - 4,
        textColor: rgb(0, 0, 0),
        backgroundColor: rgb(1, 1, 1),
        border: undefined,
      });
      
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
  const donoField = createTextFieldWithAppearance(form, 'dono_processo', donoProcesso, font, 10, true);
  donoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // OBJETIVO DO PROCESSO
  page.drawText("OBJETIVO DO PROCESSO:", { x: xStart, y: yPos, size: 12, font });
  const objetivoField = createTextFieldWithAppearance(form, 'objetivo_processo', objetivoProcesso, font, 10, true);
  objetivoField.addToPage(page, { x: xStart + 320, y: yPos - 8, width: 230, height: 28 });
  yPos -= 38;

  // SERVIÇOS DE ENTRADAS / SAÍDA
  page.drawText("SERVIÇOS DE ENTRADAS", { x: xStart, y: yPos, size: 12, font });
  page.drawText("SERVIÇO DE SAÍDA", { x: xStart + 320, y: yPos, size: 12, font });
  const entradaField = createTextFieldWithAppearance(form, 'servicos_entrada', servicosEntrada, font, 10, true);
  console.log("Campo servicos_entrada criado com valor:", servicosEntrada || "");
  entradaField.addToPage(page, { x: xStart, y: yPos - 28, width: 290, height: 48 });
  const saidaField = createTextFieldWithAppearance(form, 'servico_saida', servicoSaida, font, 10, true);
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
      const textField = createTextFieldWithAppearance(form, fieldName, atividades[row][col], font, 8, false);
      textField.addToPage(page, { x: xPos + 2, y: camposY + 2, width: colWidthTemplate2[col] - 4, height: 16 });
      xPos += colWidthTemplate2[col];
    }
    camposY -= 20;
  }

  // Indicadores
  let indicadoresY = camposY - 32;
  page.drawText("Indicadores de monitorização do processo", { x: xStart, y: indicadoresY, size: 12, font });
  indicadoresY -= 22;
  
  // Tratar indicadores como array ou objeto
  if (Array.isArray(indicadores)) {
    // Se for array, criar campos dinamicamente
    indicadores.forEach((indicador, index) => {
      const fieldName = `indicadores_r${index + 1}`;
      const textField = createTextFieldWithAppearance(form, fieldName, indicador || '', font, 10, true);
      textField.addToPage(page, { x: xStart, y: indicadoresY, width: 550, height: 28 });
      indicadoresY -= 32;
    });
  } else {
    // Se for objeto, usar os 3 campos fixos
    const indicadorFields = ['indicadores_r1', 'indicadores_r2', 'indicadores_r3'];
    indicadorFields.forEach((fieldName) => {
      const textField = createTextFieldWithAppearance(form, fieldName, indicadores[fieldName] || '', font, 10, true);
      textField.addToPage(page, { x: xStart, y: indicadoresY, width: 550, height: 28 });
      indicadoresY -= 32;
    });
  }

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

  // Sanitizador: tratar valores apenas com '-' (ou traços/espaços) como vazios no Template 2 (não editável)
  const dashToEmpty = (val) => {
    const s = (val ?? '').toString();
    // Se contém apenas espaços e traços (inclui diferentes tipos de traço), considera vazio
    return /^[\s\-–—]*$/.test(s) ? '' : s;
  };

  // Aplica sanitização a todos os campos relevantes do Template 2
  const atividadesClean = safeAtividades.map(row => Array.isArray(row) ? row.map(dashToEmpty) : ['', '', '', '', '', '']);
  const indicadoresClean = safeIndicadores.map(dashToEmpty).filter(text => text !== '');
  const donoProcessoClean = dashToEmpty(safeDonoProcesso);
  const objetivoProcessoClean = dashToEmpty(safeObjetivoProcesso);
  const servicosEntradaClean = dashToEmpty(safeServicosEntrada);
  const servicoSaidaClean = dashToEmpty(safeServicoSaida);

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
  let yPos = drawProcessHeaderTableCentered(page, font, yStart, donoProcessoClean, objetivoProcessoClean, servicosEntradaClean, servicoSaidaClean, xStartCentered);
  
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

  // Desenha tabela de atividades (paginação e centralizada)
  const baseRowHeight = 25;
  let yPos2 = yPos - 1;

  // Calcula altura dinâmica para cada linha com base no conteúdo
  const getRowHeight = (rowData) => {
    let maxLines = 1;
    rowData.forEach((cellText, colIdx) => {
      const wrappedLines = wrapText((cellText || ''), font, 8, colWidthTemplate2[colIdx] - 8);
      maxLines = Math.max(maxLines, wrappedLines.length);
    });
    return Math.max(baseRowHeight, maxLines * 10 + 10);
  };

  // Calcula alturas de todas as linhas
  const rowHeights = atividadesClean.map(row => getRowHeight(row));
  const headerHeight = 35;

  // Helpers para paginação
  const marginBottom = 25;
  let currentPage = page;

  const createNewPage = async () => {
    const newPage = pdfDoc.addPage([pageSize[0], pageSize[1]]);
    await addHeader(newPage, font, title, imageBytes, pathFilename);
    return newPage;
  };

  const drawActivityHeaders = (pg, yTop) => {
    let xPosLocal = xStartCentered;
    headers.forEach((header, idx) => {
      // Fundo do cabeçalho
      pg.drawRectangle({
        x: xPosLocal,
        y: yTop - headerHeight,
        width: colWidthTemplate2[idx],
        height: headerHeight,
        color: rgb(0.7, 0.7, 0.7),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      // Texto
      const headerLines = header.split('\n');
      headerLines.forEach((line, lineIdx) => {
        pg.drawText(line, {
          x: xPosLocal + 4,
          y: yTop - 12 - (lineIdx * 10),
          size: 9,
          font,
          color: rgb(0, 0, 0),
        });
      });
      xPosLocal += colWidthTemplate2[idx];
    });
  };

  // Desenha primeira página de atividades
  drawActivityHeaders(currentPage, yPos2);
  let currentY = yPos2 - headerHeight;

  for (let row = 0; row < atividadesClean.length; row++) {
    const rowHeight = rowHeights[row];

    // Verifica espaço; se não couber, cria nova página e redesenha headers
    if (currentY - rowHeight < marginBottom) {
      currentPage = await createNewPage();
      drawActivityHeaders(currentPage, yStart);
      currentY = yStart - headerHeight;
    }

    let dataX = xStartCentered;
    // Células da linha
    for (let col = 0; col < atividadesClean[row].length; col++) {
      currentPage.drawRectangle({
        x: dataX,
        y: currentY - rowHeight,
        width: colWidthTemplate2[col],
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const cellText = atividadesClean[row][col] || '';
      const wrappedLines = wrapText(cellText, font, 8, colWidthTemplate2[col] - 8);

      wrappedLines.forEach((line, lineIdx) => {
        if (lineIdx < 8) {
          const availableWidth = colWidthTemplate2[col] - 8;
          const textWidth = font.widthOfTextAtSize(line, 8);
          if (textWidth <= availableWidth) {
            currentPage.drawText(line, {
              x: dataX + 4,
              y: currentY - 15 - (lineIdx * 10),
              size: 8,
              font,
              color: rgb(0, 0, 0),
            });
          } else {
            let truncatedText = line;
            while (font.widthOfTextAtSize(truncatedText + '...', 8) > availableWidth && truncatedText.length > 0) {
              truncatedText = truncatedText.slice(0, -1);
            }
            currentPage.drawText(truncatedText + (truncatedText.length < line.length ? '...' : ''), {
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

  // Atualiza yPos para continuar com indicadores
  yPos = currentY;

  // Desenha indicadores com paginação
  yPos -= 50;

  const drawIndicatorsHeader = (pg, yTop) => {
    pg.drawRectangle({
      x: xStartCentered,
      y: yTop - 25,
      width: 540,
      height: 25,
      color: rgb(0.7, 0.7, 0.7),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    pg.drawText("Indicadores de monitorização do processo", {
      x: xStartCentered + 10,
      y: yTop - 15,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // Garante espaço para o header dos indicadores
  if (yPos - 25 < marginBottom) {
    currentPage = await createNewPage();
    yPos = yStart;
  }
  drawIndicatorsHeader(currentPage, yPos);
  yPos -= 25;
  
  // Desenha indicadores com altura dinâmica
  const processedIndicadores = indicadoresClean.slice(0, 10); // Limita a 10 indicadores e remove '-'
  for (let idx = 0; idx < processedIndicadores.length; idx++) {
    const indicador = processedIndicadores[idx];
    const text = (indicador || '').toString().trim();
    if (text && text !== 'testestesteste' && !text.includes('teste')) { // Filtro de segurança
      const lines = wrapText(text, font, 9, 520);
      const indicadorHeight = Math.max(30, lines.length * 12 + 15);

      // Nova página se não couber
      if (yPos - indicadorHeight < marginBottom) {
        currentPage = await createNewPage();
        // Header de indicadores no topo da nova página
        drawIndicatorsHeader(currentPage, yStart);
        yPos = yStart - 25;
      }

      // Desenha a célula do indicador
      currentPage.drawRectangle({
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
            currentPage.drawText(line, {
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
            
            currentPage.drawText(truncatedText + (truncatedText.length < line.length ? '...' : ''), {
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
  }

  return await pdfDoc.save();
}

// Função principal para gerar PDF não editável
export async function generateNonEditablePdf(data, headers, dataObs, title = "Procedimento", imageBytes = null, pathFilename = "") {
  const { pdfDoc, page: firstPage, font } = await createBasePdf(title, imageBytes, pathFilename);

  // Validações de entrada
  const safeData = Array.isArray(data) && data.length > 0 ? data : [['', '', '', '', '']];
  const safeHeaders = Array.isArray(headers) && headers.length > 0 ? headers : ['', '', '', '', ''];
  const safeDataObs = Array.isArray(dataObs) && dataObs.length > 0 ? dataObs : [['']];
  
  // Desenha tabela de observações na primeira página COM headers cinza
  const obsResult = await drawObsTableWithHeaders(firstPage, font, safeDataObs, imageBytes, pathFilename);
  
  // Agora temos que usar a última página e posição Y do resultado
  let page = obsResult.currentPage;
  let yPos = obsResult.currentYPosition - spaceBetweenTables;

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
  // Offsets de linhas para permitir dividir uma mesma linha em várias páginas
  const rowLineOffsets = safeData.map((row) => row.map(() => 0));
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

  // Posição inicial da tabela principal - já configurada acima
  let rowIndex = 0;
  // Controla se o cabeçalho da tabela (nomes das colunas) já foi desenhado
  let headerDrawn = false;

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

  // Desenha um "pedaço" (chunk) de uma linha muito alta que não cabe na página
  function drawRowChunk(page, row, yTop, availableHeight, drawHeaderOnThisPage) {
    // Se deve desenhar o header nesta página
    let yCursor = yTop;
    let headerHeightLocal = 0;
    if (drawHeaderOnThisPage) {
      headerHeightLocal = rowHeightsDynamic[0];
      drawTableHeaders(page, yCursor, headerHeightLocal);
      yCursor -= headerHeightLocal;
      availableHeight -= headerHeightLocal;
    }

    // Quantidade máxima de linhas de texto que cabem no espaço disponível
    const maxLinesFit = Math.max(1, Math.floor((availableHeight - 16) / lineHeight));
    // Linhas restantes da linha atual (maior entre as colunas)
    const maxRemainingLines = Math.max(
      ...wrappedData[row].map((lines, col) => Math.max(0, lines.length - rowLineOffsets[row][col]))
    );
    const linesThisChunk = Math.max(1, Math.min(maxLinesFit, maxRemainingLines));
    const chunkHeight = linesThisChunk * lineHeight + 16;

    // Desenha grid do chunk (uma única linha de altura variável)
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    // Linha superior
    page.drawLine({ start: { x: xStart, y: yCursor }, end: { x: xStart + totalWidth, y: yCursor }, thickness: 1, color: rgb(0, 0, 0) });
    // Linhas verticais
    let xPosGrid = xStart;
    for (let j = 0; j <= colWidths.length; j++) {
      page.drawLine({ start: { x: xPosGrid, y: yCursor }, end: { x: xPosGrid, y: yCursor - chunkHeight }, thickness: 1, color: rgb(0, 0, 0) });
      if (j < colWidths.length) xPosGrid += colWidths[j];
    }
    // Linha inferior
    page.drawLine({ start: { x: xStart, y: yCursor - chunkHeight }, end: { x: xStart + totalWidth, y: yCursor - chunkHeight }, thickness: 1, color: rgb(0, 0, 0) });

    // Desenha o conteúdo (subset de linhas por coluna)
    let xPos = xStart;
    for (let col = 0; col < safeData[row].length; col++) {
      const allLines = wrappedData[row][col] || [];
      const offset = rowLineOffsets[row][col] || 0;
      const remaining = Math.max(0, allLines.length - offset);
      const drawCount = Math.min(remaining, linesThisChunk);

      let textY = yCursor - 8;
      for (let i = 0; i < drawCount; i++) {
        const line = allLines[offset + i];
        const currentY = textY - i * lineHeight;
        const cellBottom = yCursor - chunkHeight + 4;
        if (currentY < cellBottom) break; // Garantia extra
        page.drawText(line, {
          x: xPos + 4,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: maxWidths[col] || 100,
        });
      }
      // Avança o offset desta coluna
      rowLineOffsets[row][col] = offset + drawCount;
      xPos += colWidths[col];
    }

    return { drawnHeight: headerHeightLocal + chunkHeight, chunkHeight, headerHeightLocal, yAfter: yCursor - chunkHeight };
  }

  // Desenha a tabela principal, quebrando para nova página se necessário
  while (rowIndex < safeData.length) {
    // Calcular espaço disponível nesta página (não redefinir yPos automaticamente)
    let availableHeight = yPos - marginBottom;

  console.log(`📏 Espaço disponível na página atual = ${availableHeight} (header já desenhado: ${headerDrawn})`);

    // Quantas linhas cabem nesta página
  let rowsThisPage = 0;
  let heightSum = headerDrawn ? 0 : rowHeightsDynamic[0]; // reserva espaço do header se ainda não foi desenhado
    
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
    
    // Se nenhuma linha cabe inteira nesta página, empurra tudo para a próxima página.
    // Só divide uma linha se ela não couber nem numa nova página vazia (fallback raro).
    if (rowsThisPage === 0 && rowIndex < safeData.length) {
      const nextRowHeight = rowHeightsDynamic[rowIndex + 1] || 50;
      const pageUsableHeight = (yStart - marginBottom) - rowHeightsDynamic[0]; // espaço abaixo do header numa nova página

      if (nextRowHeight <= pageUsableHeight) {
        // Cabe numa nova página: cria a nova página e volta para o loop (sem desenhar nada aqui)
        const newPage = pdfDoc.addPage([pageSize[0], pageSize[1]]);
        await addHeader(newPage, font, '', imageBytes, pathFilename); // logo + caminho em todas as páginas
        page = newPage;
        // Ainda não desenhámos o cabeçalho; manter como não desenhado para sair desenhado na nova página
        yPos = yStart;
        console.log(`➡️ Empurrando linha ${rowIndex} para a próxima página inteira.`);
        continue; // recalcula availableHeight e rowsThisPage
      } else {
        // Nem numa página nova cabe: dividir em chunks (fallback)
        console.log(`✂️ Linha ${rowIndex} é maior que uma página. Dividindo em páginas.`);

        // Desenha um pedaço da linha atual nesta página
        let yCursor = yPos;
        const availableHere = availableHeight;
        drawRowChunk(page, rowIndex, yCursor, availableHere, false); // não desenhar cabeçalho de colunas

        // Continua em páginas seguintes até acabar
        while (wrappedData[rowIndex].some((lines, col) => (rowLineOffsets[rowIndex][col] || 0) < lines.length)) {
          const nextPage = pdfDoc.addPage([pageSize[0], pageSize[1]]);
          await addHeader(nextPage, font, '', imageBytes, pathFilename);
          page = nextPage;
          drawRowChunk(page, rowIndex, yStart, (yStart - marginBottom), false);
        }

        rowIndex += 1; // linha completamente desenhada
        // Cabeçalho da tabela já terá sido desenhado quando for a vez de linhas normais
        yPos = yStart;
        continue;
      }
    }

    // Desenha grid e headers
    const rowsToDraw = rowsThisPage > 0 ? rowsThisPage : 1;
    const willDrawHeader = !headerDrawn; // indica se vamos desenhar o cabeçalho agora
    if (willDrawHeader) {
      drawTableGrid(page, yPos, [rowHeightsDynamic[0], ...rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw)], rowsToDraw, true);
      drawTableHeaders(page, yPos, rowHeightsDynamic[0]);
      headerDrawn = true; // a partir daqui não voltamos a desenhar o cabeçalho
    } else {
      drawTableGrid(page, yPos, rowHeightsDynamic.slice(rowIndex + 1, rowIndex + 1 + rowsToDraw), rowsToDraw, false);
    }

    // Desenha dados
    let yData = yPos - (willDrawHeader ? rowHeightsDynamic[0] : 0);
    
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
    // Atualiza posição Y disponível na mesma página para continuar empurrando as células seguintes para baixo
    yPos = yData;
    
    console.log(`✅ Desenhadas ${rowsToDraw} linhas. Próximo índice: ${rowIndex}/${safeData.length}`);
    
    // Se ainda há linhas para desenhar, só cria nova página se não houver espaço útil
    if (rowIndex < safeData.length) {
      const remainingSpace = yPos - marginBottom;
      if (remainingSpace < 60) {
        console.log(`📄 Pouco espaço restante (${remainingSpace}). Criando nova página.`);
        const newPage = pdfDoc.addPage([pageSize[0], pageSize[1]]);
        await addHeader(newPage, font, '', imageBytes, pathFilename);
        page = newPage;
        // O cabeçalho da tabela já foi desenhado anteriormente; manter headerDrawn=true
        yPos = yStart;
      } else {
        // Continuar na mesma página (header já desenhado anteriormente)
        // Nada a fazer aqui
      }
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
  
  // Calcular altura dinâmica para o objetivo do processo
  const objetivoWrapped = wrapText(objetivoProcesso || '', font, 10, rightColWidth - 16);
  const minRowHeight = 35;
  const lineHeight = 12;
  const padding = 10;
  const objetivoRowHeight = Math.max(minRowHeight, (objetivoWrapped.length * lineHeight) + padding);
  
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
    y: yPos - headerHeight - objetivoRowHeight,
    width: leftColWidth,
    height: objetivoRowHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight,
    width: rightColWidth,
    height: objetivoRowHeight,
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
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight,
    width: leftColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight,
    width: rightColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('SERVIÇOS DE ENTRADAS', {
    x: xStart + 8,
    y: yPos - headerHeight - objetivoRowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('SERVIÇO DE SAÍDA', {
    x: xStart + leftColWidth + 8,
    y: yPos - headerHeight - objetivoRowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Conteúdo
  page.drawRectangle({
    x: xStart,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight,
    width: leftColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStart + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight,
    width: rightColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Texto dos serviços com quebra de linha adequada
  let fontSize = 9;
  
  const entradaWrapped = wrapText(servicosEntrada || '', font, fontSize, leftColWidth - 16);
  const saidaWrapped = wrapText(servicoSaida || '', font, fontSize, rightColWidth - 16);
  
  let entradaY = yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - 15;
  let saidaY = entradaY;
  
  entradaWrapped.forEach((line, idx) => {
    if (entradaY - (idx * 12) > yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight + 5) {
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
    if (saidaY - (idx * 12) > yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight + 5) {
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
  return yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight - 25;
}

// Função centralizada para o header do processo
export function drawProcessHeaderTableCentered(page, font, yPos, donoProcesso, objetivoProcesso, servicosEntrada, servicoSaida, xStartCentered) {
  // Larguras das colunas ajustadas
  const totalWidth = 540;
  const leftColWidth = 200;
  const rightColWidth = totalWidth - leftColWidth;
  
  // Calcular altura dinâmica para o objetivo do processo
  const objetivoWrapped = wrapText(objetivoProcesso || '', font, 10, rightColWidth - 16);
  const minRowHeight = 35;
  const lineHeight = 12;
  const padding = 10;
  const objetivoRowHeight = Math.max(minRowHeight, (objetivoWrapped.length * lineHeight) + padding);
  
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
    y: yPos - headerHeight - objetivoRowHeight,
    width: leftColWidth,
    height: objetivoRowHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight,
    width: rightColWidth,
    height: objetivoRowHeight,
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
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight,
    width: leftColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight,
    width: rightColWidth,
    height: entradaSaidaHeight,
    color: rgb(0.7, 0.7, 0.7),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText('SERVIÇOS DE ENTRADAS', {
    x: xStartCentered + 8,
    y: yPos - headerHeight - objetivoRowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText('SERVIÇO DE SAÍDA', {
    x: xStartCentered + leftColWidth + 8,
    y: yPos - headerHeight - objetivoRowHeight - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // SERVIÇOS DE ENTRADAS / SAÍDA - Conteúdo
  page.drawRectangle({
    x: xStartCentered,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight,
    width: leftColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: xStartCentered + leftColWidth,
    y: yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight,
    width: rightColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Texto dos serviços com quebra de linha adequada
  let fontSize = 9;
  
  const entradaWrapped = wrapText(servicosEntrada || '', font, fontSize, leftColWidth - 16);
  const saidaWrapped = wrapText(servicoSaida || '', font, fontSize, rightColWidth - 16);
  
  let entradaY = yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - 15;
  let saidaY = entradaY;
  
  entradaWrapped.forEach((line, idx) => {
    if (entradaY - (idx * 12) > yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight + 5) {
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
    if (saidaY - (idx * 12) > yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight + 5) {
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
  return yPos - headerHeight - objetivoRowHeight - entradaSaidaHeight - contentHeight - 25;
}
