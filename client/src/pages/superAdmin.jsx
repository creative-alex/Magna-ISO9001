import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EditableTable from "../components/editTable";
import ExportPdfButton from "../components/Buttons/exportPdf";

const tabelas = [
  {
    key: "obs",
    label: "Tabela Observações",
    headers: [<>Observações</>],
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
    label: "Tabela dinâmica (igual ao PDF)",
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
      ]
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

  // Buscar dados do PDF selecionado
  useEffect(() => {
    if (!filename) return;
    fetch(`http://localhost:8080/files/pdf-form-data?filename=${encodeURIComponent(filename)}`)
      .then(res => res.json())
      .then(formData => {
        const newTableData = {};
        tabelas.forEach(t => {
          newTableData[t.key] = t.fieldNames.map(row =>
            row.map(field => formData[field] || "")
          );
        });
        setTableData(newTableData);
      });
  }, [filename]);

  return (
    <div>
      <h2>Super Admin - Listar e Editar PDFs</h2>
      {tabelas.map(t => (
        <div key={t.key}>
          <h2>{t.label}</h2>
          <EditableTable
            data={tableData[t.key]}
            onChange={(rowIdx, colIdx, value) =>
              setTableData(prev => {
                const newData = prev[t.key].map(row => [...row]);
                newData[rowIdx][colIdx] = value;
                return { ...prev, [t.key]: newData };
              })
            }
            headersHtml={t.headers}
          />
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <ExportPdfButton
          data={tableData.main}
          headers={tabelas[1].headers}
          dataObs={tableData.obs}
          headersObs={tabelas[0].headers}
        />
      </div>
    </div>
  );
}

