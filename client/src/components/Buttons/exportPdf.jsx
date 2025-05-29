import React from "react";
import { generateEditablePdf, generateNonEditablePdf } from "../../utils/pdfUtils";

export default function ExportPdfButton({ data, headers, dataObs, headersObs, filePath = "meu_editavel.pdf" }) {
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

  // Função para fazer download do PDF não editável
  const handleDownloadNonEditable = async () => {
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

    const nonEditablePdfBytes = await generateNonEditablePdf(data, stringHeaders, dataObs, headersObs);
    const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename.replace(".pdf", "_nao_editavel.pdf");
    link.click();
  };

  return (
    <div>
      <button onClick={handleSendToBackend}>
        Guardar Mudanças
      </button>
      <button onClick={handleDownloadNonEditable} style={{ marginLeft: 8 }}>
        Baixar
      </button>
    </div>
  );
}