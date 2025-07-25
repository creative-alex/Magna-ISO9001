import React from "react";
import { generateEditablePdf } from "../../utils/pdfGenerate";

export default function SimpleDownloadPdfButton({
  templateType = 1,
  data,
  headers,
  dataObs,
  headersObs,
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  servicosEntrada,
  servicoSaida,
  filename = "documento_editavel.pdf",
  buttonText = "⬇️ Download PDF Editável",
  style = {}
}) {
  const defaultStyle = {
    backgroundColor: '#28a745', 
    color: 'white', 
    padding: '10px 20px', 
    border: 'none', 
    borderRadius: '5px', 
    cursor: 'pointer',
    fontSize: '14px',
    margin: '10px',
    ...style
  };

  const handleDownload = async () => {
    try {
      const stringHeaders = headers ? headers.map(h =>
        typeof h === "string"
          ? h
          : h?.props?.children
            ? Array.isArray(h.props.children)
              ? h.props.children.join('')
              : h.props.children
            : String(h)
      ) : [];

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
        servicoSaida
      });

      const blob = new Blob([editablePdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF editável:", error);
      alert("Erro ao gerar PDF editável. Tente novamente.");
    }
  };

  return (
    <button onClick={handleDownload} style={defaultStyle}>
      {buttonText}
    </button>
  );
}
