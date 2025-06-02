import React from "react";
import { generateEditablePdf, generateNonEditablePdfFromHtml } from "../../utils/pdfUtils";

export default function ExportPdfButton({ data, headers, dataObs, headersObs, filePath = "meu_editavel.pdf", getTablesHtml }) {
  // Função para enviar PDF editável para o backend
  const handleSendToBackend = async () => {
    const stringHeaders = headers.map(h =>
      typeof h === "string"
        ? h
        : h?.props?.children
          ? Array.isArray(h.props.children)
            ? h.props.children.join('')
            : h.props.children
          : String(h)
    );

    const parts = filePath.split("/");
    const filename = parts.pop();
    const folders = parts;

    const editablePdfBytes = await generateEditablePdf(data, stringHeaders, dataObs);
    const formData = new FormData();
    formData.append("file", new Blob([editablePdfBytes], { type: "application/pdf" }), filename);
    formData.append("folders", JSON.stringify(folders));
    formData.append("filename", filename);

    await fetch("http://localhost:8080/files/upload-pdf", {
      method: "POST",
      body: formData,
    });
  };

  // Mostra preview do PDF não editável
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
    <div>
      <button onClick={handleSendToBackend}>
        Guardar Mudanças
      </button>
      <button onClick={handlePreviewNonEditable}>
        Preview
      </button>
    </div>
  );
}