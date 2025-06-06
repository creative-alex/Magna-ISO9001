import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import EditableTable from "../components/editTable";
import ExportPdfButton from "../components/Buttons/exportPdf";

const tabelas = [
  {
    key: "obs",
    headers: [],
    fieldNames: [
      ["table1_r1"],
      ["table1_r2"],
      ["table1_r3"],
      ["table1_r4"],
      ["table1_r5"]
    ],
    rows: 5,
    cols: 1
  },
  {
    key: "main",
    headers: [
      <>Fluxo<br />das Ações</>,
      <>Descrição</>,
      <>Responsável</>,
      <>Documentos<br />Associados</>,
      <>Instruções<br />de Trabalho</>
    ],
    fieldNames: [
      [
        "table2_r2_c1", "table2_r2_c2", "table2_r2_c3", "table2_r2_c4", "table2_r2_c5"
      ],
      [
        "table2_r3_c1", "table2_r3_c2", "table2_r3_c3", "table2_r3_c4", "table2_r3_c5"
      ],
      [
        "table2_r4_c1", "table2_r4_c2", "table2_r4_c3", "table2_r4_c4", "table2_r4_c5"
      ],
      [
        "table2_r5_c1", "table2_r5_c2", "table2_r5_c3", "table2_r5_c4", "table2_r5_c5"
      ],
      [
        "table2_r6_c1", "table2_r6_c2", "table2_r6_c3", "table2_r6_c4", "table2_r6_c5"
      ],
      [
        "table2_r7_c1", "table2_r7_c2", "table2_r7_c3", "table2_r7_c4", "table2_r7_c5"
      ],
      

    ],
    rows: 6,
    cols: 5
  }
];

export default function SuperAdmin() {
  const { filename } = useParams();
  const [tableData, setTableData] = useState(
    tabelas.reduce((acc, t) => ({ ...acc, [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill("")) }), {})
  );
  const [mainFieldNames, setMainFieldNames] = useState([...tabelas[1].fieldNames]);

  // Refs para as tabelas
  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  // Buscar dados do PDF selecionado
  useEffect(() => {
    if (!filename) return;
    fetch("http://localhost:8080/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    })
      .then(res => res.json())
      .then(formData => {
        setTableData(prev => ({
          ...prev,
          main: mainFieldNames.map(row => row.map(field => formData[field] || "")),
          obs: tabelas[0].fieldNames.map(row => row.map(field => formData[field] || ""))
        }));
      });
  }, [filename, mainFieldNames]);

  // Função para obter o HTML das tabelas
  const getTablesHtml = () => ({
    mainTableHtml: mainTableRef.current ? mainTableRef.current.outerHTML : "",
    obsTableHtml: obsTableRef.current ? obsTableRef.current.outerHTML : ""
  });

  // Função para adicionar uma linha à tabela principal
  const handleAddRow = () => {
    // Novo índice para a linha
    const newRowIdx = mainFieldNames.length + 2; // começa em 2
    // Cria os novos nomes dos campos
    const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) => `table2_r${newRowIdx}_c${colIdx + 1}`);
    setMainFieldNames(prev => [...prev, newFieldRow]);
    setTableData(prev => ({
      ...prev,
      main: [...prev.main, Array(tabelas[1].cols).fill("")]
    }));
  };

  return (
    <>
    <div>
      <h2>{tableData.filename}</h2>
      <div>
        <div>
          <h2>{tabelas[0].label}</h2>
          <div ref={obsTableRef}>
            <EditableTable
              data={tableData.obs}
              onChange={(rowIdx, colIdx, value) =>
                setTableData(prev => {
                  const newData = prev.obs.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, obs: newData };
                })
              }
              headersHtml={tabelas[0].headers}
            />
          </div>
        </div>
        <div>
          <h2>{tabelas[1].label}</h2>
          <div ref={mainTableRef}>
            <EditableTable
              data={tableData.main}
              onChange={(rowIdx, colIdx, value) =>
                setTableData(prev => {
                  const newData = prev.main.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, main: newData };
                })
              }
              headersHtml={tabelas[1].headers}
            />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <ExportPdfButton
          data={tableData.main}
          headers={tabelas[1].headers}
          dataObs={tableData.obs}
          headersObs={tabelas[0].headers}
          filePath={filename}
          getTablesHtml={getTablesHtml}
          fieldNames={mainFieldNames} 
        />
      </div>
    </div>
          <button onClick={handleAddRow}>Adicionar Linha</button>
</>
  );
}