import React from "react";
import { generateEditablePdf, generateNonEditablePdf } from "../../utils/pdfUtils";

export default function ExportPdfButton({ data, headers }) {
  const handleBothPdfs = async () => {
    // 1. Gera PDF editável e envia para backend
    const editablePdfBytes = await generateEditablePdf(data, headers);
    const formData = new FormData();
    formData.append('file', new Blob([editablePdfBytes], { type: 'application/pdf' }), 'editavele.pdf');
    await fetch('http://localhost:8080/files/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    // 2. Gera PDF não editável e faz download
    const nonEditablePdfBytes = await generateNonEditablePdf(data, headers);
    const blob = new Blob([nonEditablePdfBytes], { type: 'application/pdf' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tabela.pdf";
    link.click();
  };

  return (
    <button onClick={handleBothPdfs}>
      Enviar PDF editável e baixar PDF não editável
    </button>
  );
}