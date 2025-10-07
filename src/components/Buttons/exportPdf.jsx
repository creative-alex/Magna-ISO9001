import React, { useEffect } from "react";
import { generateEditablePdf } from "../../utils/pdfGenerate";

export default function ExportPdfButton({
  templateType = 1,
  data,
  headers,
  dataObs,
  headersObs,
  atividades,
  donoProcesso,
  donoProcessoOriginal,
  objetivoProcesso,
  indicadores,
  pathFilename,
  fieldNames,
  exportRef,
  servicosEntrada,
  servicoSaida,
  onSaveSuccess, // Novo prop para callback após guardar
  history = [] // Novo prop para histórico
}) {
  // Função para carregar automaticamente a imagem PNG da empresa
  const loadCompanyImage = async () => {
    try {
      const response = await fetch('/c_comenius_cor.png');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log("✅ Imagem da empresa carregada automaticamente");
        return arrayBuffer;
      } else {
        console.warn("⚠️ Imagem da empresa não encontrada");
        return null;
      }
    } catch (error) {
      console.error("❌ Erro ao carregar imagem da empresa:", error);
      return null;
    }
  };

  // Função para preparar os dados para envio ao backend
  const getMainTableFormData = () => {
    const formDataObj = {};
    data.forEach((row, rowIdx) => {
      const rowFields = fieldNames[rowIdx] || [];
      row.forEach((cell, colIdx) => {
        const fieldName = rowFields[colIdx] || `table2_r${rowIdx + 2}_c${colIdx + 1}`;
        formDataObj[fieldName] = cell || "";
      });
    });
    return formDataObj;
  };

  // Função para enviar PDF editável para o backend
  const handleSendToBackend = async () => {
    console.log("🔍 DEBUG - pathFilename recebido:", pathFilename);
    console.log("🔍 DEBUG - tipo do pathFilename:", typeof pathFilename);
    console.log("🔍 DEBUG - pathFilename está vazio?", !pathFilename);
    
    console.log("handleSendToBackend chamado com:");
    console.log("templateType:", templateType);
    console.log("servicosEntrada:", servicosEntrada);
    console.log("servicoSaida:", servicoSaida);
    
    const stringHeaders = headers.map(h =>
      typeof h === "string"
        ? h
        : h?.props?.children
          ? Array.isArray(h.props.children)
            ? h.props.children.join('')
            : h.props.children
          : String(h)
    );

    const parts = pathFilename.split("/");
    const filename = parts.pop();
    const folders = parts;
    
    console.log("🔍 DEBUG - parts após split:", parts);
    console.log("🔍 DEBUG - filename:", filename);
    console.log("🔍 DEBUG - folders:", folders);

    // Carregar automaticamente a imagem PNG da empresa
    let imageBytes = await loadCompanyImage();
    if (imageBytes) {
      imageBytes = new Uint8Array(imageBytes);
      console.log("✅ Imagem da empresa carregada:", imageBytes.length, "bytes");
    }

    console.log("🔍 DEBUG ExportPdfButton - templateType:", templateType);
    console.log("🔍 DEBUG ExportPdfButton - history recebido:", history);
    console.log("🔍 DEBUG ExportPdfButton - history length:", history?.length);

    // Passe todos os dados e o templateType
    const editablePdfBytes = await generateEditablePdf({
      templateType,
      data,
      headers: stringHeaders,
      dataObs,
      headersObs,
      atividades,
      donoProcesso,
      objetivoProcesso,
      indicadores,
      servicosEntrada,
      servicoSaida,
      title: "Procedimento",
      imageBytes,
      pathFilename: pathFilename || "SemNome/documento.pdf", // ← FALLBACK se estiver vazio
      history
    });
    
    console.log("🔍 DEBUG - pathFilename enviado para generateEditablePdf:", pathFilename || "SemNome/documento.pdf");
    
    const formData = new FormData();
    formData.append("file", new Blob([editablePdfBytes], { type: "application/pdf" }), filename);
    formData.append("folders", JSON.stringify(folders));
    formData.append("filename", filename);
    formData.append("originalFilename", pathFilename); 

    // Adiciona os dados dinâmicos ao formData
    if (templateType === 1) {
      const mainTableFormData = getMainTableFormData();
      formData.append("mainTableData", JSON.stringify(mainTableFormData));
      formData.append("servicos_entrada", servicosEntrada || "");
      formData.append("servico_saida", servicoSaida || "");
      console.log("Template 1 - Enviando servicos_entrada:", servicosEntrada || "");
      console.log("Template 1 - Enviando servico_saida:", servicoSaida || "");
    } else if (templateType === 2) {
      formData.append("atividades", JSON.stringify(atividades));
      formData.append("donoProcesso", donoProcesso);
      formData.append("objetivoProcesso", objetivoProcesso);
      formData.append("servicos_entrada", servicosEntrada);
      formData.append("servico_saida", servicoSaida);
      
      // Para Template2, sempre tratar indicadores como array e converter para campos individuais
      if (Array.isArray(indicadores)) {
        indicadores.forEach((indicador, index) => {
          formData.append(`indicadores_r${index + 1}`, indicador || "");
        });
      } else {
        // Fallback se ainda for objeto
        formData.append("indicadores_r1", indicadores.indicadores_r1 || "");
        formData.append("indicadores_r2", indicadores.indicadores_r2 || "");
        formData.append("indicadores_r3", indicadores.indicadores_r3 || "");
      }
      
      console.log("Template 2 - Enviando atividades:", atividades);
      console.log("Template 2 - Enviando indicadores:", indicadores);
      console.log("Template 2 - Enviando servicos_entrada:", servicosEntrada);
      console.log("Template 2 - Enviando servico_saida:", servicoSaida);
    }

    await fetch("https://api-iso-9001.onrender.com/files/upload-pdf", {
      method: "POST",
      body: formData,
    });

    // Se o dono do processo foi alterado (apenas para Template2), atualizar no backend
    if (templateType === 2 && donoProcesso !== donoProcessoOriginal) {
      try {
        console.log("Atualizando dono do processo:", donoProcesso);
        const processId = pathFilename; // Usando o filename como processId
        
        await fetch("https://api-iso-9001.onrender.com/files/update-dono-processo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processId: processId,
            donoProcesso: donoProcesso
          }),
        });
        
        console.log("Dono do processo atualizado com sucesso!");
      } catch (error) {
        console.error("Erro ao atualizar dono do processo:", error);
      }
    }

    // Chama o callback para indicar que foi guardado com sucesso
    if (onSaveSuccess) {
      onSaveSuccess();
    }
  };

  // Função para pré-visualizar o PDF editável
  const handlePreviewPdf = async () => {
    console.log("🔍 handlePreviewPdf - pathFilename recebido:", pathFilename);
    
    const stringHeaders = headers.map(h =>
      typeof h === "string"
        ? h
        : h?.props?.children
          ? Array.isArray(h.props.children)
            ? h.props.children.join('')
            : h.props.children
          : String(h)
    );

    // Carregar automaticamente a imagem PNG da empresa
    let imageBytes = await loadCompanyImage();
    if (imageBytes) {
      imageBytes = new Uint8Array(imageBytes);
    }

    const editablePdfBytes = await generateEditablePdf({
      templateType,
      data,
      headers: stringHeaders,
      dataObs,
      headersObs,
      atividades,
      donoProcesso,
      servicosEntrada,
      servicoSaida,
      objetivoProcesso,
      indicadores,
      imageBytes,
      pathFilename,
      history
    });

    // Cria um blob e abre o PDF editável em uma nova aba
    const blob = new Blob([editablePdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Permite que o parent chame handleSendToBackend
  useEffect(() => {
    if (exportRef) {
      exportRef.current = handleSendToBackend;
    }
  }, [exportRef, handleSendToBackend]);

  return (
    <button className="save-button" onClick={handleSendToBackend}>
      Guardar Mudanças
    </button>
  );
}
