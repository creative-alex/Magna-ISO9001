import React, { useEffect, useState } from "react";
import PDFEditor from "react-pdf-editor";

const PDFEditorFromBackend = ({ token, pdfPath }) => {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdf = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8080/files/get-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, pdfPath }),
        });

        if (!response.ok) throw new Error("Erro ao buscar PDF");

        const blob = await response.blob();
        setPdfData(URL.createObjectURL(blob));
      } catch (err) {
        alert("Erro: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPdf();
  }, [token, pdfPath]);

  if (loading) return <div>Carregando PDF...</div>;
  if (!pdfData) return <div>PDF não encontrado.</div>;

  return (
    <PDFEditor
      src={pdfData}
      onSave={(pdfBytes, formFields) => {
        // Exemplo: baixar localmente o PDF editado
        const editedBlob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(editedBlob);
        link.download = "documento-editado.pdf";
        link.click();
      }}
    />
  );
};

export default PDFEditorFromBackend;
