import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import EditableTable from "../components/ProcessTable";
import ExportPdfButton from "../components/Buttons/exportPdf";
import PreviewPdfButton from "../components/Buttons/previewPDF";
import { generateEditablePdf } from "../utils/pdfUtils"; // Certifique-se que o caminho está correto

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
    headers: ["Observações"], // Adiciona um header para a tabela de observações
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

export default function SuperAdmin() {
  const { filename } = useParams();
  const [tableData, setTableData] = useState(
    tabelas.reduce((acc, t) => ({ ...acc, [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill("")) }), {})
  );
  const [mainFieldNames, setMainFieldNames] = useState([...tabelas[1].fieldNames]);

  // Buscar dados do PDF selecionado (ATUALIZADO)
  useEffect(() => {
    if (!filename) return;
    fetch("http://localhost:8080/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    })
      .then(res => res.json())
      .then(formData => {
        // Descobre quantas linhas existem nos campos table2_rX_cY
        const mainFields = Object.keys(formData).filter(f => /^table2_r\d+_c\d+$/.test(f));
        const rowNumbers = mainFields.map(f => parseInt(f.match(/^table2_r(\d+)_c\d+$/)[1], 10));
        const maxRow = Math.max(...rowNumbers, 1); // pelo menos 1 linha

        // Gera mainFieldNames dinamicamente
        const newMainFieldNames = [];
        for (let row = 2; row <= maxRow; row++) {
          const rowFields = [];
          for (let col = 1; col <= tabelas[1].cols; col++) {
            rowFields.push(`table2_r${row}_c${col}`);
          }
          newMainFieldNames.push(rowFields);
        }

        setMainFieldNames(newMainFieldNames);

        setTableData(prev => ({
          ...prev,
          main: newMainFieldNames.map(row =>
            row.map(field => formData[field] || "")
          ),
          obs: tabelas[0].fieldNames.map(row =>
            row.map(field => formData[field] || "")
          )
        }));
      });
  }, [filename]); // Removida a dependência mainFieldNames

  // Função para substituir \n por <br/> no HTML das tabelas
  const replaceNewlinesWithBr = html => html.replace(/\n/g, "<br/>");

  // Função para obter o HTML das tabelas, já com <br/> nas quebras de linha
  const getTablesHtml = () => ({
    mainTableHtml: mainTableRef.current
      ? replaceNewlinesWithBr(mainTableRef.current.outerHTML)
      : "",
    obsTableHtml: obsTableRef.current
      ? replaceNewlinesWithBr(obsTableRef.current.outerHTML)
      : ""
  });

  // Função para adicionar uma linha à tabela principal
  const handleAddRow = () => {
    const newRowIdx = mainFieldNames.length + 2;
    const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) =>
      `table2_r${newRowIdx}_c${colIdx + 1}`
    );
    
    // Atualização otimizada do estado
    setMainFieldNames(prev => [...prev, newFieldRow]);
    setTableData(prev => ({
      ...prev,
      main: [...prev.main, Array(tabelas[1].cols).fill("")]
    }));
  };

  // Refs para as tabelas
  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  function DownloadEditablePdfButton({ data, headers, dataObs, filePath = "meu_editavel.pdf", fieldNames }) {
    const handleDownload = async () => {
      const stringHeaders = headers.map(h =>
        typeof h === "string"
          ? h
          : h?.props?.children
            ? Array.isArray(h.props.children)
              ? h.props.children.join('')
              : h.props.children
            : String(h)
      );
      const editablePdfBytes = await generateEditablePdf(data, stringHeaders, dataObs);
      const blob = new Blob([editablePdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filePath;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    return (
      <button onClick={handleDownload}>
        Download PDF Editável
      </button>
    );
  }

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
      <div>
        <DownloadEditablePdfButton
          data={tableData.main}
          headers={tabelas[1].headers}
          dataObs={tableData.obs}
          filePath={filename}
          fieldNames={mainFieldNames}
        />
        <ExportPdfButton
          data={tableData.main}
          headers={tabelas[1].headers}
          dataObs={tableData.obs}
          headersObs={tabelas[0].headers}
          filePath={filename}
          fieldNames={mainFieldNames}
          filename={filename}  
        />
        <PreviewPdfButton getTablesHtml={getTablesHtml} />
      </div>
    </div>
          <button onClick={handleAddRow}>Adicionar Linha</button>
</>
  );
}