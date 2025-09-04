import React from "react";
import { generateNonEditablePdfFromHtml, generateNonEditablePdfTemplate2 } from "../../utils/pdfGenerate";

export default function PreviewPdfButton({ 
  getTablesHtml, 
  templateType = 1,
  // Props específicas para Template 2
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida
}) {
  const handlePreviewNonEditable = async () => {
    if (templateType === 2) {
      // Usa a função específica do Template 2
      const nonEditablePdfBytes = await generateNonEditablePdfTemplate2(
        atividades,
        donoProcesso,
        objetivoProcesso,
        indicadores,
        servicosEntrada,
        servicoSaida
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
      const nonEditablePdfBytes = await generateNonEditablePdfFromHtml(mainTableHtml, obsTableHtml);
      const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    }
  };

  return (
    <button className="preview-button" onClick={handlePreviewNonEditable}>
      Preview
    </button>
  );
}