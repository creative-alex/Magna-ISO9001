import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import TabelaPdf from "../pages/tableDisplay";
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
    key: "processo",
    headers: [
      "DONO DO PROCESSO (nomeado):",
      "OBJETIVO DO PROCESSO:",
      "SERVIÇOS DE ENTRADAS",
      "SERVIÇO DE SAÍDA"
    ],
    fieldNames: [
      ["dono_processo"],
      ["objetivo_processo"],
      ["servicos_entrada"],
      ["servico_saida"]
    ],
    rows: 4,
    cols: 1
  },
  {
    key: "main",
    headers: [
      "Principais Atividades",
      "Procedimentos Associados",
      "Requisitos ISO 9001",
      "Requisitos DGERT",
      "Requisitos EQAVET",
      "Requisitos CQCQ"
    ],
    fieldNames: [
      [
        "atividades_r1_c1", "atividades_r1_c2", "atividades_r1_c3", "atividades_r1_c4", "atividades_r1_c5", "atividades_r1_c6"
      ],
      [
        "atividades_r2_c1", "atividades_r2_c2", "atividades_r2_c3", "atividades_r2_c4", "atividades_r2_c5", "atividades_r2_c6"
      ],
      [
        "atividades_r3_c1", "atividades_r3_c2", "atividades_r3_c3", "atividades_r3_c4", "atividades_r3_c5", "atividades_r3_c6"
      ],
      [
        "atividades_r4_c1", "atividades_r4_c2", "atividades_r4_c3", "atividades_r4_c4", "atividades_r4_c5", "atividades_r4_c6"
      ]
      // Adiciona mais linhas se precisares
    ],
    rows: 4, // Quantas linhas quiseres
    cols: 6
  },
  {
    key: "indicadores",
    headers: ["Indicadores de monitorização do processo"],
    fieldNames: [
      ["indicadores_r1"],
      // Adiciona mais se precisares
    ],
    rows: 2,
    cols: 1
  }
];


export default function TablePageUnified() {
  const { filename } = useParams();
  const location = useLocation();

  console.log("TablePageUnified renderizou");
  console.log("filename do useParams:", filename);
  console.log("location:", location);

  const originalFilename =
    location?.state?.originalFilename
      ? location.state.originalFilename
      : decodeURIComponent(filename || "").replace(/__/g, '/').replace(/-/g, ' ');

  console.log("originalFilename:", originalFilename);

  // Extrai só o nome do ficheiro (após o último '__')
  const fileNameOnly = filename ? filename.split('__').pop() : "";
  console.log("fileNameOnly extraído:", fileNameOnly);

  // Escolhe o template conforme o filename
  let template, isTemplate2 = false;
  if (/^\d[-_]/.test(fileNameOnly)) { 
    template = tabelasTemplate2;
    isTemplate2 = true;
    console.log("Template selecionado: tabelasTemplate2");
  } else if (/^\d{2}[-_]/.test(fileNameOnly)) { 
    template = tabelas;
    console.log("Template selecionado: tabelas");
  } else {
    template = tabelas; // fallback
    console.log("Template selecionado: tabelas (fallback)");
  }
  console.log("isTemplate2:", isTemplate2);

  // Estado das tabelas
  const [tableData, setTableData] = useState(() => {
    const initial = template.reduce((acc, t) => ({ ...acc, [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill("")) }), {});
    console.log("Estado inicial tableData:", initial);
    return initial;
  });
  const [mainFieldNames, setMainFieldNames] = useState(() => {
    console.log("mainFieldNames inicial:", template[1].fieldNames);
    return [...template[1].fieldNames];
  });

const [atividades, setAtividades] = useState([
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""]
]);
const [indicadores, setIndicadores] = useState([
  [""],
]);
const [donoProcesso, setDonoProcesso] = useState("");
const [objetivoProcesso, setObjetivoProcesso] = useState("");


  // Handlers para Template2
  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    setAtividades(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
  };
  const handleIndicadoresChange = (rowIdx, value) => {
    setIndicadores(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][0] = value;
      return novo;
    });
  };

  // Reinicializa estado quando o template muda
  useEffect(() => {
    const initial = template.reduce((acc, t) => ({
      ...acc,
      [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill(""))
    }), {});
    console.log("useEffect [template] disparado. Novo estado tableData:", initial);
    setTableData(initial);
    setMainFieldNames([...template[1].fieldNames]);
    // Reinicializa também os estados extra do Template2
    setAtividades([["", "", "", "", "", ""],
                   ["", "", "", "", "", ""],
                   ["", "", "", "", "", ""],
                   ["", "", "", "", "", ""]]);
    setIndicadores([[""]]);
    setDonoProcesso("");
    setObjetivoProcesso("");
  }, [template]);

  // Refs para exportação/preview
  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  // Buscar dados do PDF selecionado (opcional, pode remover se não usar)
  useEffect(() => {
    console.log("useEffect [filename, originalFilename] disparado");
    if (!filename) {
      console.log("filename não existe, abortando fetch.");
      return;
    }

    let currentTemplate = template;
    console.log("Template usado no fetch:", currentTemplate);

    fetch("http://localhost:8080/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: originalFilename }),
    })
      .then(res => {
        console.log("Resposta do backend:", res);
        if (!res.ok) throw new Error("Erro no backend ou ficheiro não encontrado");
        return res.json();
      })
      .then(formData => {
        console.log("formData recebido:", formData);
        let mainFields, rowNumbers, maxRow, newMainFieldNames;
        if (currentTemplate === tabelas) {
          mainFields = Object.keys(formData).filter(f => /^table2_r\d+_c\d+$/.test(f));
          console.log("mainFields (tabelas):", mainFields);
          rowNumbers = mainFields.map(f => parseInt(f.match(/^table2_r(\d+)_c\d+$/)[1], 10));
          console.log("rowNumbers (tabelas):", rowNumbers);
          maxRow = Math.max(...rowNumbers, 1);
          console.log("maxRow (tabelas):", maxRow);
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
          console.log("mainFields (tabelasTemplate2):", mainFields);
          rowNumbers = mainFields.map(f => parseInt(f.match(/^t2_table2_r(\d+)_c\d+$/)[1], 10));
          console.log("rowNumbers (tabelasTemplate2):", rowNumbers);
          maxRow = Math.max(...rowNumbers, 2);
          console.log("maxRow (tabelasTemplate2):", maxRow);
          newMainFieldNames = [];
          for (let row = 2; row <= maxRow; row++) {
            const rowFields = [];
            for (let col = 1; col <= currentTemplate[1].cols; col++) {
              rowFields.push(`t2_table2_r${row}_c${col}`);
            }
            newMainFieldNames.push(rowFields);
          }
        }

        console.log("newMainFieldNames:", newMainFieldNames);

        setMainFieldNames(newMainFieldNames);

        setTableData(prev => {
          const newState = {
            ...prev,
            main: newMainFieldNames.map(row =>
              row.map(field => formData[field] || "")
            ),
            obs: currentTemplate[0].fieldNames
              ? currentTemplate[0].fieldNames.map(row =>
                  row.map(field => formData[field] || "")
                )
              : Array.from({ length: currentTemplate[0].rows }, () => Array(currentTemplate[0].cols).fill(""))
          };
          console.log("Novo estado tableData após fetch:", newState);
          return newState;
        });
      })
      .catch(err => {
        console.error("ERRO AO BUSCAR PDF:", err);
      });
  }, [filename, originalFilename]);

  // Função para adicionar uma linha à tabela principal (apenas para template 1)
  const handleAddRow = () => {
    console.log("handleAddRow chamado");
    if (template === tabelas) {
      const newRowIdx = mainFieldNames.length + 2;
      const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) =>
        `table2_r${newRowIdx}_c${colIdx + 1}`
      );
      console.log("Nova linha a adicionar:", newFieldRow);
      setMainFieldNames(prev => {
        const novo = [...prev, newFieldRow];
        console.log("mainFieldNames após adicionar linha:", novo);
        return novo;
      });
      setTableData(prev => {
        const novo = {
          ...prev,
          main: [...prev.main, Array(tabelas[1].cols).fill("")]
        };
        console.log("tableData após adicionar linha:", novo);
        return novo;
      });
    }
  };

  // Função para exportação/preview
  const getTablesHtml = () => {
    const obj = {
      mainTableHtml: mainTableRef.current ? mainTableRef.current.outerHTML : "",
      obsTableHtml: obsTableRef.current ? obsTableRef.current.outerHTML : ""
    };
    console.log("getTablesHtml chamado:", obj);
    return obj;
  };

  // Logs do estado atual a cada render
  console.log("tableData atual:", tableData);
  console.log("mainFieldNames atual:", mainFieldNames);

  return (
    <div>
      <h2>{originalFilename || "Template 2"}</h2>
      {isTemplate2 ? (
        <>
          <TabelaPdf
            templateType={2}
            data={tableData.main}
            dataObs={tableData.obs}
            atividades={atividades}
            indicadores={indicadores}
            donoProcesso={donoProcesso}
            setDonoProcesso={setDonoProcesso}
            objetivoProcesso={objetivoProcesso}
            setObjetivoProcesso={setObjetivoProcesso}
            handleAtividadesChange={handleAtividadesChange}
            handleIndicadoresChange={handleIndicadoresChange}
            handleChange={
              (rowIdx, colIdx, value) => {
                setTableData(prev => {
                  const newData = prev.main.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, main: newData };
                });
              }
            }
          />
          <ExportPdfButton
            templateType={isTemplate2 ? 2 : 1}
            data={tableData.main}
            headers={template[1].headers}
            dataObs={tableData.obs}
            headersObs={template[0].headers}
            atividades={atividades}
            donoProcesso={donoProcesso}
            objetivoProcesso={objetivoProcesso}
            indicadores={indicadores}
          />
          <PreviewPdfButton getTablesHtml={getTablesHtml} />
        </>
      ) : (
        <>
          <div ref={obsTableRef}>
            <EditableTable
              data={tableData.obs}
              onChange={(rowIdx, colIdx, value) => {
                setTableData(prev => {
                  const newData = prev.obs.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, obs: newData };
                });
              }}
              headersHtml={template[0].headers}
            />
          </div>
          <div ref={mainTableRef}>
            <EditableTable
              data={tableData.main}
              onChange={(rowIdx, colIdx, value) => {
                setTableData(prev => {
                  const newData = prev.main.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, main: newData };
                });
              }}
              headersHtml={template[1].headers}
            />
          </div>
          <button onClick={handleAddRow}>+</button>
          <ExportPdfButton
            templateType={isTemplate2 ? 2 : 1}
            data={tableData.main}
            headers={template[1].headers}
            dataObs={tableData.obs}
            headersObs={template[0].headers}
            atividades={atividades}
            donoProcesso={donoProcesso}
            objetivoProcesso={objetivoProcesso}
            indicadores={indicadores}
          />
          <PreviewPdfButton getTablesHtml={getTablesHtml} />
        </>
      )}
    </div>
  );
}
