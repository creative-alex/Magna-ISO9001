import React, { useState } from "react";
import EditableTable from "./editTable";
import ExportPdfButton from "./Buttons/exportPdf";

export default function TabelaPdf() {
  // Nova tabela: 1 coluna, 5 linhas
  const headersObs = ["Observações"];
  const headersHtmlObs = [<>Observações</>];
  const [dataObs, setDataObs] = useState(Array.from({ length: 5 }, () => [""]));

  const handleChangeObs = (rowIdx, colIdx, value) => {
    const newData = dataObs.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setDataObs(newData);
  };

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
      <h2>Tabela Observações</h2>
      <EditableTable data={dataObs} onChange={handleChangeObs} headersHtml={headersHtmlObs} />
      <h2 style={{ marginTop: 32 }}>Tabela dinâmica (igual ao PDF)</h2>
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />
      <div style={{ marginTop: 16 }}>
        <ExportPdfButton data={data} headers={headers} />
      </div>
    </div>
  );
}