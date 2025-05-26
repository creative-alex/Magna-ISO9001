import React, { useState } from "react";
import EditableTable from "../components/editTable";
import ExportPdfButton from "../components/Buttons/exportPdf";

export default function TabelaPdf() {
  const headers = [
    'Fluxo\ndas Ações',
    'Descrição',
    'Responsável',
    'Documentos\nAssociados',
    'Instruções\nde Trabalho'
  ];
  const headersHtml = [
    <>Fluxo<br />das Ações</>,
    <>Descrição</>,
    <>Responsável</>,
    <>Documentos<br />Associados</>,
    <>Instruções<br />de Trabalho</>
  ];

  const [data, setData] = useState(
    Array.from({ length: 6 }, () => Array(5).fill(""))
  );

  const handleChange = (rowIdx, colIdx, value) => {
    const newData = data.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setData(newData);
  };

  return (
    <div>
      <h2>Tabela dinâmica (igual ao PDF)</h2>
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />
      <div style={{ marginTop: 16 }}>
        <ExportPdfButton data={data} headers={headers} />
      </div>
    </div>
  );
}