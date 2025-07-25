import React from "react";
import { generateEditablePdf } from "../../utils/pdfGenerate";

export default function DownloadEditablePdfButton({
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
  buttonStyle = { 
    backgroundColor: '#28a745', 
    color: 'white', 
    padding: '8px 16px', 
    border: 'none', 
    borderRadius: '4px', 
    cursor: 'pointer',
    fontSize: '14px'
  }
}) {
  const handleDownloadEditablePdf = async () => {
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

      // Cria um blob e faz download do PDF editável
      const blob = new Blob([editablePdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      // Cria um elemento de link temporário para fazer download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Libera a URL do objeto
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF editável:", error);
      alert("Erro ao gerar PDF editável. Tente novamente.");
    }
  };

  return (
    <button onClick={handleDownloadEditablePdf} style={buttonStyle}>
      {buttonText}
    </button>
  );
}
