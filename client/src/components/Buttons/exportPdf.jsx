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
  objetivoProcesso,
  indicadores,
  filePath = "meu_editavel.pdf",
  fieldNames,
  exportRef
}) {
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
      indicadores
    });

    const formData = new FormData();
    formData.append("file", new Blob([editablePdfBytes], { type: "application/pdf" }), filename);
    formData.append("folders", JSON.stringify(folders));
    formData.append("filename", filename);

    // Adiciona os dados dinâmicos ao formData
    if (templateType === 1) {
      const mainTableFormData = getMainTableFormData();
      formData.append("mainTableData", JSON.stringify(mainTableFormData));
    } else if (templateType === 2) {
      formData.append("atividades", JSON.stringify(atividades));
      formData.append("donoProcesso", donoProcesso);
      formData.append("objetivoProcesso", objetivoProcesso);
      formData.append("indicadores", JSON.stringify(indicadores));
    }

    await fetch("http://localhost:8080/files/upload-pdf", {
      method: "POST",
      body: formData,
    });
  };

  // Função para pré-visualizar o PDF editável
  const handlePreviewPdf = async () => {
    const stringHeaders = headers.map(h =>
      typeof h === "string"
        ? h
        : h?.props?.children
          ? Array.isArray(h.props.children)
            ? h.props.children.join('')
            : h.props.children
          : String(h)
    );

    const editablePdfBytes = await generateEditablePdf({
      templateType,
      data,
      headers: stringHeaders,
      dataObs,
      headersObs,
      atividades,
      donoProcesso,
      objetivoProcesso,
      indicadores
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
    <button onClick={handlePreviewPdf}>
      Preview PDF Editável
    </button>
  );
}