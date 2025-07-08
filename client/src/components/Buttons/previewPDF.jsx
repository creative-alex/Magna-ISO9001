import React from "react";
import { generateNonEditablePdfFromHtml } from "../../utils/pdfGenerate";

export default function PreviewPdfButton({ getTablesHtml }) {
  const handlePreviewNonEditable = async () => {
    if (!getTablesHtml) {
      alert("Função getTablesHtml não fornecida!");
      return;
    }
    const { mainTableHtml, obsTableHtml } = getTablesHtml();
    const nonEditablePdfBytes = await generateNonEditablePdfFromHtml(mainTableHtml, obsTableHtml);
    const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  };

  return (
    <button onClick={handlePreviewNonEditable}>
      Preview
    </button>
  );
}