import React, { useEffect } from "react";
import { generateEditablePdf } from "../../utils/pdfUtils";

export default function ExportPdfButton({ data, headers, dataObs, filePath = "meu_editavel.pdf", fieldNames, exportRef }) {
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

    // Adiciona os dados dinâmicos ao formData
    const mainTableFormData = getMainTableFormData();
    formData.append("mainTableData", JSON.stringify(mainTableFormData));

    await fetch("http://localhost:8080/files/upload-pdf", {
      method: "POST",
      body: formData,
    });
  };

  // Permite que o parent chame handleSendToBackend
  useEffect(() => {
    if (exportRef) {
      exportRef.current = handleSendToBackend;
    }
  }, [exportRef, handleSendToBackend]);

  return (
    <button onClick={handleSendToBackend}>
      Guardar Mudanças
    </button>
  );
}