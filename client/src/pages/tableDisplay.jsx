import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import TabelaPdf from "../components/tabelaPDF";
import EditableTable from "../components/EditableTable";
import ExportPdfButton from "../components/Buttons/exportPdf";
import PreviewPdfButton from "../components/Buttons/previewPDF";

// Definição dos dois templates
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

const tabelasTemplate2 = [
  {
    key: "obs",
    headers: ["Observações"],
    fieldNames: [
      ["t2_table1_r1"],
      ["t2_table1_r2"],
      ["t2_table1_r3"]
    ],
    rows: 3,
    cols: 1
  },
  {
    key: "main",
    headers: [
      <>Etapa</>,
      <>Descrição</>,
      <>Responsável</>,
      <>Notas</>
    ],
    fieldNames: [
      [
        "t2_table2_r2_c1", "t2_table2_r2_c2", "t2_table2_r2_c3", "t2_table2_r2_c4"
      ],
      [
        "t2_table2_r3_c1", "t2_table2_r3_c2", "t2_table2_r3_c3", "t2_table2_r3_c4"
      ],
      [
        "t2_table2_r4_c1", "t2_table2_r4_c2", "t2_table2_r4_c3", "t2_table2_r4_c4"
      ]
    ],
    rows: 3,
    cols: 4
  }
];

export default function TablePageUnified() {
  const { filename } = useParams();
  const location = useLocation();

  const originalFilename =
    location?.state?.originalFilename
      ? location.state.originalFilename
      : decodeURIComponent(filename || "").replace(/__/g, '/').replace(/-/g, ' ');

  // Extrai só o nome do ficheiro (após o último '__')
  const fileNameOnly = filename ? filename.split('__').pop() : "";

  // Escolhe o template conforme o filename
  let template, isTemplate2 = false;
  if (/^\d{2}[-_]/.test(fileNameOnly)) {
    template = tabelas;
  } else if (/^\d{1}[-_]/.test(fileNameOnly)) {
    template = tabelasTemplate2;
    isTemplate2 = true;
  } else {
    template = tabelas; // fallback
  }

  // Estado das tabelas
  const [tableData, setTableData] = useState(
    template.reduce((acc, t) => ({ ...acc, [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill("")) }), {})
  );
  const [mainFieldNames, setMainFieldNames] = useState([...template[1].fieldNames]);

  // Refs para exportação/preview
  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  // Buscar dados do PDF selecionado (opcional, pode remover se não usar)
  useEffect(() => {
    if (!filename) return;

    let currentTemplate = template;

    fetch("http://localhost:8080/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: originalFilename }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Erro no backend ou ficheiro não encontrado");
        return res.json();
      })
      .then(formData => {
        let mainFields, rowNumbers, maxRow, newMainFieldNames;
        if (currentTemplate === tabelas) {
          mainFields = Object.keys(formData).filter(f => /^table2_r\d+_c\d+$/.test(f));
          rowNumbers = mainFields.map(f => parseInt(f.match(/^table2_r(\d+)_c\d+$/)[1], 10));
          maxRow = Math.max(...rowNumbers, 1);
          newMainFieldNames = [];
          for (let row = 2; row <= maxRow; row++) {
            const rowFields = [];
            for (let col = 1; col <= currentTemplate[1].cols; col++) {
              rowFields.push(`table2_r${row}_c${col}`);
            }
            newMainFieldNames.push(rowFields);
          }
        } else {
          mainFields = Object.keys(formData).filter(f => /^t2_table2_r\d+_c\d+$/.test(f));
          rowNumbers = mainFields.map(f => parseInt(f.match(/^t2_table2_r(\d+)_c\d+$/)[1], 10));
          maxRow = Math.max(...rowNumbers, 2);
          newMainFieldNames = [];
          for (let row = 2; row <= maxRow; row++) {
            const rowFields = [];
            for (let col = 1; col <= currentTemplate[1].cols; col++) {
              rowFields.push(`t2_table2_r${row}_c${col}`);
            }
            newMainFieldNames.push(rowFields);
          }
        }

        setMainFieldNames(newMainFieldNames);

        setTableData(prev => ({
          ...prev,
          main: newMainFieldNames.map(row =>
            row.map(field => formData[field] || "")
          ),
          obs: currentTemplate[0].fieldNames
            ? currentTemplate[0].fieldNames.map(row =>
                row.map(field => formData[field] || "")
              )
            : Array.from({ length: currentTemplate[0].rows }, () => Array(currentTemplate[0].cols).fill(""))
        }));
      })
      .catch(err => {
        console.error("ERRO AO BUSCAR PDF:", err);
      });
  }, [filename, originalFilename]);

  // Função para adicionar uma linha à tabela principal (apenas para template 1)
  const handleAddRow = () => {
    if (template === tabelas) {
      const newRowIdx = mainFieldNames.length + 2;
      const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) =>
        `table2_r${newRowIdx}_c${colIdx + 1}`
      );
      setMainFieldNames(prev => [...prev, newFieldRow]);
      setTableData(prev => ({
        ...prev,
        main: [...prev.main, Array(tabelas[1].cols).fill("")]
      }));
    }
  };

  // Função para exportação/preview
  const getTablesHtml = () => ({
    mainTableHtml: mainTableRef.current ? mainTableRef.current.outerHTML : "",
    obsTableHtml: obsTableRef.current ? obsTableRef.current.outerHTML : ""
  });

  return (
    <div>
      <h2>{originalFilename || "Template 2"}</h2>
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
          headers={template[0].headers}
        />
      </div>
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
          headers={template[1].headers}
        />
      </div>
      {!isTemplate2 && (
        <button onClick={handleAddRow}>+</button>
      )}
      <ExportPdfButton
        data={tableData.main}
        headers={template[1].headers}
        dataObs={tableData.obs}
        headersObs={template[0].headers}
        getTablesHtml={getTablesHtml}
      />
      <PreviewPdfButton getTablesHtml={getTablesHtml} />
    </div>
  );
}