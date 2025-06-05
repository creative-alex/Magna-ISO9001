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
      <EditableTable data={dataObs} onChange={handleChangeObs} headersHtml={headersHtmlObs} />
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />
      <div>
        <ExportPdfButton
          data={data}
          headers={headers}
          dataObs={dataObs}
          headersObs={headersObs}
        />
      </div>
    </div>
  );
}