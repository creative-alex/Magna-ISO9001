import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();


  const originalFilename =
    location?.state?.originalFilename
      ? location.state.originalFilename
      : decodeURIComponent(filename || "").replace(/__/g, '/').replace(/-/g, ' ');


  // Extrai só o nome do ficheiro (após o último '__')
  const fileNameOnly = filename ? filename.split('__').pop() : "";

  // Escolhe o template conforme o filename
  let template, isTemplate2 = false;
  if (/^\d{2}/.test(fileNameOnly)) { // Arquivos que começam com 2 dígitos são Template 1
    template = tabelas;
  } else if (/^\d/.test(fileNameOnly)) { // Arquivos que começam com 1 dígito são Template 2
    template = tabelasTemplate2;
    isTemplate2 = true;
  } else {
    template = tabelas; // fallback para Template 1
  }

  // Estado das tabelas
  const [tableData, setTableData] = useState(() => {
    const initial = template.reduce((acc, t) => ({ ...acc, [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill("")) }), {});
    return initial;
  });
  const [mainFieldNames, setMainFieldNames] = useState(() => {
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
const [servicosEntrada, setServicosEntrada] = useState("");
const [servicoSaida, setServicoSaida] = useState("");

// Estado para rastrear se há mudanças não guardadas
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Effect para prevenir saída da página com mudanças não guardadas
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tem alterações não guardadas. Tem a certeza que quer sair?';
      return 'Tem alterações não guardadas. Tem a certeza que quer sair?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [hasUnsavedChanges]);

// Effect separado para interceptar o botão voltar do browser
useEffect(() => {
  let isBlocking = false;

  const setupBlocker = () => {
    if (hasUnsavedChanges && !isBlocking) {
      isBlocking = true;
      // Adiciona um estado "guardião" ao histórico
      window.history.pushState({ blocker: true }, '', window.location.href);
    } else if (!hasUnsavedChanges && isBlocking) {
      isBlocking = false;
      // Remove o estado guardião se não há mudanças
      if (window.history.state?.blocker) {
        window.history.back();
      }
    }
  };

  const handlePopState = (event) => {
    if (hasUnsavedChanges && event.state?.blocker) {
      // Interceptou o botão voltar
      const shouldLeave = window.confirm('Tem alterações não guardadas. Tem a certeza que quer sair?');
      
      if (shouldLeave) {
        // Utilizador quer sair - limpa o estado e navega
        setHasUnsavedChanges(false);
        isBlocking = false;
        // Navega para trás (salta o estado blocker)
        window.history.go(-2);
      } else {
        // Utilizador quer ficar - reestabelece o blocker
        window.history.pushState({ blocker: true }, '', window.location.href);
      }
    }
  };

  setupBlocker();
  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
    // Limpa o estado blocker se existir
    if (isBlocking && window.history.state?.blocker) {
      window.history.back();
    }
  };
}, [hasUnsavedChanges]);



  // Handlers para Template2
  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    setAtividades(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
    setHasUnsavedChanges(true);
  };
  const handleIndicadoresChange = (rowIdx, value) => {
    setIndicadores(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][0] = value;
      return novo;
    });
    setHasUnsavedChanges(true);
  };

  // Função para atualizar donoProcesso no backend
  const updateDonoProcessoBackend = async (newDonoProcesso) => {
    try {
      // Extrai o nome do processo (antes do primeiro "/")
      const nomeProcesso = originalFilename.split('/')[0];
      console.log("Atualizando donoProcesso no backend:", { originalFilename, nomeProcesso, newDonoProcesso });
      
      const response = await fetch("http://localhost:8080/files/update-dono-processo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          processId: nomeProcesso,
          donoProcesso: newDonoProcesso 
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar donoProcesso no backend");
      }

      const result = await response.json();
      console.log("donoProcesso atualizado com sucesso:", result);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar donoProcesso:", error);
      return false;
    }
  };

  // Função personalizada para setDonoProcesso que também atualiza o backend
  const handleSetDonoProcesso = async (newDonoProcesso) => {
    // Atualiza o estado local
    setDonoProcesso(newDonoProcesso);
    setHasUnsavedChanges(true);
    
    // Atualiza no backend
    await updateDonoProcessoBackend(newDonoProcesso);
  };

  // Wrappers para outros setters que marcam mudanças
  const handleSetObjetivoProcesso = (value) => {
    setObjetivoProcesso(value);
    setHasUnsavedChanges(true);
  };

  const handleSetServicosEntrada = (value) => {
    setServicosEntrada(value);
    setHasUnsavedChanges(true);
  };

  const handleSetServicoSaida = (value) => {
    setServicoSaida(value);
    setHasUnsavedChanges(true);
  };

  // Reinicializa estado quando o template muda
  useEffect(() => {
    const initial = template.reduce((acc, t) => ({
      ...acc,
      [t.key]: Array.from({ length: t.rows }, () => Array(t.cols).fill(""))
    }), {});
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
    setServicosEntrada("");
    setServicoSaida("");
    // Reset do estado de mudanças não guardadas
    setHasUnsavedChanges(false);
  }, [template]);

  // Refs para exportação/preview
  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  // Buscar dados do PDF selecionado (opcional, pode remover se não usar)
  useEffect(() => {
    if (!filename) {
      return;
    }

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
          return newState;
        });

        // Atualiza os estados extra do Template2
        if (currentTemplate === tabelasTemplate2) {
          setDonoProcesso(formData.dono_processo || "");
          setObjetivoProcesso(formData.objetivo_processo || "");
          setAtividades([
            [
              formData.atividades_r1_c1 || "",
              formData.atividades_r1_c2 || "",
              formData.atividades_r1_c3 || "",
              formData.atividades_r1_c4 || "",
              formData.atividades_r1_c5 || "",
              formData.atividades_r1_c6 || "",
            ],
            [
              formData.atividades_r2_c1 || "",
              formData.atividades_r2_c2 || "",
              formData.atividades_r2_c3 || "",
              formData.atividades_r2_c4 || "",
              formData.atividades_r2_c5 || "",
              formData.atividades_r2_c6 || "",
            ],
            [
              formData.atividades_r3_c1 || "",
              formData.atividades_r3_c2 || "",
              formData.atividades_r3_c3 || "",
              formData.atividades_r3_c4 || "",
              formData.atividades_r3_c5 || "",
              formData.atividades_r3_c6 || "",
            ],
            [
              formData.atividades_r4_c1 || "",
              formData.atividades_r4_c2 || "",
              formData.atividades_r4_c3 || "",
              formData.atividades_r4_c4 || "",
              formData.atividades_r4_c5 || "",
              formData.atividades_r4_c6 || "",
            ],
          ]);
          setIndicadores([
            [formData.indicadores_r1 || ""]
          ]);
          setServicosEntrada(formData.servicos_entrada || "");
          setServicoSaida(formData.servico_saida || "");
        } else {
          // Para Template 1, também carrega os serviços se existirem
          setServicosEntrada(formData.servicos_entrada || "");
          setServicoSaida(formData.servico_saida || "");
        }

        // Reset do estado de mudanças após carregar dados
        setHasUnsavedChanges(false);
      })
      .catch(err => {
      });
  }, [filename, originalFilename]);

  // Função para adicionar uma linha à tabela principal (apenas para template 1)
  const handleAddRow = () => {
    if (template === tabelas) {
      const newRowIdx = mainFieldNames.length + 2;
      const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) =>
        `table2_r${newRowIdx}_c${colIdx + 1}`
      );
      setMainFieldNames(prev => {
        const novo = [...prev, newFieldRow];
        return novo;
      });
      setTableData(prev => {
        const novo = {
          ...prev,
          main: [...prev.main, Array(tabelas[1].cols).fill("")]
        };
        return novo;
      });
      setHasUnsavedChanges(true);
    }
  };

  // Função para exportação/preview
  const getTablesHtml = () => {
    const obj = {
      mainTableHtml: mainTableRef.current ? mainTableRef.current.outerHTML : "",
      obsTableHtml: obsTableRef.current ? obsTableRef.current.outerHTML : ""
    };
    return obj;
  };

  // Logs do estado atual a cada render




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
            servicosEntrada={servicosEntrada}
            setServicosEntrada={handleSetServicosEntrada}
            servicoSaida={servicoSaida}
            setServicoSaida={handleSetServicoSaida}
            indicadores={indicadores}
            donoProcesso={donoProcesso}
            setDonoProcesso={handleSetDonoProcesso}
            objetivoProcesso={objetivoProcesso}
            setObjetivoProcesso={handleSetObjetivoProcesso}
            handleAtividadesChange={handleAtividadesChange}
            handleIndicadoresChange={handleIndicadoresChange}
            handleChange={
              (rowIdx, colIdx, value) => {
                setTableData(prev => {
                  const newData = prev.main.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, main: newData };
                });
                setHasUnsavedChanges(true);
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
            pathFilename={originalFilename}
            servicosEntrada={servicosEntrada}
            servicoSaida={servicoSaida}
            onSaveSuccess={() => setHasUnsavedChanges(false)}
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
                setHasUnsavedChanges(true);
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
                setHasUnsavedChanges(true);
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
            pathFilename={originalFilename}
            servicosEntrada={servicosEntrada}
            servicoSaida={servicoSaida}
            fieldNames={mainFieldNames}
            onSaveSuccess={() => setHasUnsavedChanges(false)}
          />
          <PreviewPdfButton getTablesHtml={getTablesHtml} />
        </>
      )}
    </div>
  );
}
