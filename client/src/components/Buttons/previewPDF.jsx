import React from "react";
import { generateNonEditablePdfFromHtml, generateNonEditablePdfTemplate2 } from "../../utils/pdfGenerate";

export default function PreviewPdfButton({ 
  getTablesHtml, 
  templateType = 1,
  pathFilename, // Parâmetro para o caminho do ficheiro
  // Props específicas para Template 2
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida
}) {
  // Função para carregar automaticamente a imagem PNG da empresa
  const loadCompanyImage = async () => {
    try {
      const response = await fetch('/c_comenius_cor.png');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log("✅ Imagem da empresa carregada para preview");
        return new Uint8Array(arrayBuffer);
      } else {
        console.warn("⚠️ Imagem da empresa não encontrada para preview");
        return null;
      }
    } catch (error) {
      console.error("❌ Erro ao carregar imagem da empresa para preview:", error);
      return null;
    }
  };

  const handlePreviewNonEditable = async () => {
    // Carregar a imagem PNG da empresa
    const imageBytes = await loadCompanyImage();
    
    if (templateType === 2) {
      // Usa a função específica do Template 2
      const nonEditablePdfBytes = await generateNonEditablePdfTemplate2(
        atividades,
        donoProcesso,
        objetivoProcesso,
        indicadores,
        servicosEntrada,
        servicoSaida,
        "Procedimento",
        imageBytes,
        pathFilename || "TESTE"
      );
      const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else {
      // Template 1 - método original
      if (!getTablesHtml) {
        alert("Função getTablesHtml não fornecida!");
        return;
      }
      const { mainTableHtml, obsTableHtml } = getTablesHtml();
      const nonEditablePdfBytes = await generateNonEditablePdfFromHtml(
        mainTableHtml, 
        obsTableHtml, 
        "Procedimento", 
        imageBytes, 
        pathFilename || ""
      );
      const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    }
  };

  return (
    <button className="preview-button" onClick={handlePreviewNonEditable}>
      Download
    </button>
  );
}