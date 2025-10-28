import React from "react";
import { generateNonEditablePdfFromHtml, generateNonEditablePdfTemplate2 } from "../../utils/pdfGenerate";

export default function PreviewPdfButton({ 
  getTablesHtml, 
  templateType = 1,
  pathFilename, 
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida,
  history = [], 
  mergedSpans = {},
  hiddenCells = {}
}) {
  // Função para carregar automaticamente a imagem PNG da empresa
  const loadCompanyImage = async () => {
    try {
      const response = await fetch('/c_comenius_cor.png');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
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
        pathFilename,
        history,
        { mergedSpans, hiddenCells }
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
      console.log("🔍 DEBUG PreviewPdfButton - mainTableHtml (primeiros 500 chars):", mainTableHtml?.substring(0, 500));
      
      const nonEditablePdfBytes = await generateNonEditablePdfFromHtml(
        mainTableHtml, 
        obsTableHtml, 
        "Procedimento", 
        imageBytes, 
        pathFilename || "",
        history
      );
      const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  return (
    <button
      className="preview-button"
      onClick={handlePreviewNonEditable}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        backgroundColor: '#388e3c',
        color: 'white',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        cursor: 'pointer',
        padding: 0
      }
      }
      title="Visualizar PDF"
    >
      
    </button>
  );
}