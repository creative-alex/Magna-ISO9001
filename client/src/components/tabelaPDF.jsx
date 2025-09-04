import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import TabelaPdf from "../pages/tableDisplay";
import Template1 from "./templates/TabelaTemplate1";
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
const [donoProcessoOriginal, setDonoProcessoOriginal] = useState("");
const [objetivoProcesso, setObjetivoProcesso] = useState("");
const [servicosEntrada, setServicosEntrada] = useState("");
const [servicoSaida, setServicoSaida] = useState("");
const [funcionarios, setFuncionarios] = useState([]);

// Carregar funcionários do backend
useEffect(() => {
  const carregarFuncionarios = async () => {
    try {
      const response = await fetch("http://192.168.1.219:8080/users/getAllUsers");
      if (!response.ok) {
        throw new Error("Erro ao carregar funcionários");
      }
      const funcionariosData = await response.json();
      setFuncionarios(funcionariosData);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setFuncionarios([]); // Array vazio em caso de erro
    }
  };

  carregarFuncionarios();
}, []);

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

  // Funções para manipulação de linhas das atividades
  const handleMoveAtividadeUp = (rowIdx) => {
    if (rowIdx > 0) {
      setAtividades(prev => {
        const newAtividades = [...prev];
        const [movedRow] = newAtividades.splice(rowIdx, 1);
        newAtividades.splice(rowIdx - 1, 0, movedRow);
        return newAtividades;
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleMoveAtividadeDown = (rowIdx) => {
    if (rowIdx < atividades.length - 1) {
      setAtividades(prev => {
        const newAtividades = [...prev];
        const [movedRow] = newAtividades.splice(rowIdx, 1);
        newAtividades.splice(rowIdx + 1, 0, movedRow);
        return newAtividades;
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleInsertAtividadeAbove = (rowIdx) => {
    const newRow = ["", "", "", "", "", ""];
    setAtividades(prev => {
      const newAtividades = [...prev];
      newAtividades.splice(rowIdx, 0, newRow);
      return newAtividades;
    });
    setHasUnsavedChanges(true);
  };

  const handleInsertAtividadeBelow = (rowIdx) => {
    const newRow = ["", "", "", "", "", ""];
    setAtividades(prev => {
      const newAtividades = [...prev];
      newAtividades.splice(rowIdx + 1, 0, newRow);
      return newAtividades;
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteAtividade = (rowIdx) => {
    if (atividades.length > 1) {
      setAtividades(prev => {
        const newAtividades = [...prev];
        newAtividades.splice(rowIdx, 1);
        return newAtividades;
      });
      setHasUnsavedChanges(true);
    }
  };

  // Função para atualizar donoProcesso no backend
  const updateDonoProcessoBackend = async (newDonoProcesso) => {
    try {
      // Extrai o nome do processo (antes do primeiro "/")
      const nomeProcesso = originalFilename.split('/')[0];
      console.log("Atualizando donoProcesso no backend:", { originalFilename, nomeProcesso, newDonoProcesso });
      
      const response = await fetch("http://192.168.1.219:8080/files/update-dono-processo", {
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

    fetch("http://192.168.1.219:8080/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: originalFilename }),
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 503) {
            throw new Error("Serviço temporariamente indisponível. Tente novamente mais tarde.");
          } else if (res.status === 404) {
            throw new Error("Ficheiro não encontrado");
          }
          throw new Error("Erro no backend ou ficheiro não encontrado");
        }
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
          const donoProcessoValue = formData.dono_processo || "";
          setDonoProcesso(donoProcessoValue);
          setDonoProcessoOriginal(donoProcessoValue); // Definir valor original
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
        console.error("Erro ao carregar dados do PDF:", err);
        // Show user-friendly error message
        if (err.message.includes("temporariamente indisponível")) {
          alert("Serviço temporariamente indisponível. Os dados não foram carregados, mas pode continuar a trabalhar com dados em branco.");
        } else if (err.message.includes("não encontrado")) {
          console.log("Ficheiro não encontrado - continuando com dados em branco");
        } else {
          console.log("Erro ao carregar dados - continuando com dados em branco");
        }
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

  // Função para adicionar linha em posição específica
  const handleAddRowAt = (position, newRow, isMainTable = true) => {
    if (template === tabelas) {
      const tableKey = isMainTable ? 'main' : 'obs';
      
      setTableData(prev => {
        const newData = [...prev[tableKey]];
        newData.splice(position, 0, newRow);
        return { ...prev, [tableKey]: newData };
      });

      if (isMainTable) {
        setMainFieldNames(prev => {
          const newFieldNames = [...prev];
          const newRowIdx = position + 2;
          const newFieldRow = Array.from({ length: tabelas[1].cols }, (_, colIdx) =>
            `table2_r${newRowIdx}_c${colIdx + 1}`
          );
          newFieldNames.splice(position, 0, newFieldRow);
          return newFieldNames;
        });
      }
      
      setHasUnsavedChanges(true);
    }
  };

  // Função para deletar linha
  const handleDeleteRowAt = (rowIdx, isMainTable = true) => {
    if (template === tabelas) {
      const tableKey = isMainTable ? 'main' : 'obs';
      
      setTableData(prev => {
        const newData = [...prev[tableKey]];
        if (newData.length > 1) {
          newData.splice(rowIdx, 1);
        }
        return { ...prev, [tableKey]: newData };
      });

      if (isMainTable) {
        setMainFieldNames(prev => {
          const newFieldNames = [...prev];
          if (newFieldNames.length > 1) {
            newFieldNames.splice(rowIdx, 1);
          }
          return newFieldNames;
        });
      }
      
      setHasUnsavedChanges(true);
    }
  };

  // Função para mover linha
  const handleMoveRowAt = (fromIdx, toIdx, isMainTable = true) => {
    if (template === tabelas) {
      const tableKey = isMainTable ? 'main' : 'obs';
      
      setTableData(prev => {
        const newData = [...prev[tableKey]];
        const [movedRow] = newData.splice(fromIdx, 1);
        newData.splice(toIdx, 0, movedRow);
        return { ...prev, [tableKey]: newData };
      });

      if (isMainTable) {
        setMainFieldNames(prev => {
          const newFieldNames = [...prev];
          const [movedFieldRow] = newFieldNames.splice(fromIdx, 1);
          newFieldNames.splice(toIdx, 0, movedFieldRow);
          return newFieldNames;
        });
      }
      
      setHasUnsavedChanges(true);
    }
  };

  // Funções específicas para mover linhas para cima/baixo
  const handleMoveRowUp = (rowIdx, isMainTable = true) => {
    if (rowIdx > 0) {
      handleMoveRowAt(rowIdx, rowIdx - 1, isMainTable);
    }
  };

  const handleMoveRowDown = (rowIdx, isMainTable = true) => {
    const tableKey = isMainTable ? 'main' : 'obs';
    const tableLength = tableData[tableKey].length;
    if (rowIdx < tableLength - 1) {
      handleMoveRowAt(rowIdx, rowIdx + 1, isMainTable);
    }
  };

  // Funções específicas para inserir linhas acima/abaixo
  const handleInsertRowAbove = (rowIdx, isMainTable = true) => {
    const newRow = isMainTable ? ["", "", "", "", ""] : [""];
    handleAddRowAt(rowIdx, newRow, isMainTable);
  };

  const handleInsertRowBelow = (rowIdx, isMainTable = true) => {
    const newRow = isMainTable ? ["", "", "", "", ""] : [""];
    handleAddRowAt(rowIdx + 1, newRow, isMainTable);
  };

  // Função para exportação/preview
  const getTablesHtml = () => {
    let mainTableHtml = "";
    let obsTableHtml = "";

    if (mainTableRef.current) {
      // Clone da tabela principal para remover a coluna de ações
      const mainTableClone = mainTableRef.current.cloneNode(true);
      
      // Remove a coluna "Ações" do cabeçalho (última coluna)
      const headerRow = mainTableClone.querySelector('thead tr');
      if (headerRow) {
        const lastHeaderCell = headerRow.lastElementChild;
        if (lastHeaderCell && lastHeaderCell.textContent.includes('Ações')) {
          lastHeaderCell.remove();
        }
      }
      
      // Remove a coluna "Ações" de todas as linhas do corpo (última coluna)
      const bodyRows = mainTableClone.querySelectorAll('tbody tr');
      bodyRows.forEach((row, rowIdx) => {
        const lastCell = row.lastElementChild;
        if (lastCell) {
          lastCell.remove();
        }
        
        // Substitui o conteúdo das células dos componentes especiais pelos valores reais
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, colIdx) => {
          // Coluna 3 - Documentos Associados
          if (colIdx === 3) {
            const value = tableData.main[rowIdx] ? tableData.main[rowIdx][colIdx] : '';
            cell.innerHTML = value.split('\n').join('<br>');
          }
          // Coluna 4 - Instruções de trabalho procedimento  
          else if (colIdx === 4) {
            const value = tableData.main[rowIdx] ? tableData.main[rowIdx][colIdx] : '';
            cell.innerHTML = value.split('\n').join('<br>');
          }
        });
      });
      
      mainTableHtml = mainTableClone.outerHTML;
    }

    if (obsTableRef.current) {
      obsTableHtml = obsTableRef.current.outerHTML;
    }

    return {
      mainTableHtml,
      obsTableHtml
    };
  };

  // Logs do estado atual a cada render




  return (
    <div>
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
            donoProcessoOriginal={donoProcessoOriginal}
            setDonoProcesso={handleSetDonoProcesso}
            objetivoProcesso={objetivoProcesso}
            setObjetivoProcesso={handleSetObjetivoProcesso}
            funcionarios={funcionarios} 
            handleAtividadesChange={handleAtividadesChange}
            handleIndicadoresChange={handleIndicadoresChange}
            onMoveAtividadeUp={handleMoveAtividadeUp}
            onMoveAtividadeDown={handleMoveAtividadeDown}
            onInsertAtividadeAbove={handleInsertAtividadeAbove}
            onInsertAtividadeBelow={handleInsertAtividadeBelow}
            onDeleteAtividade={handleDeleteAtividade}
            pathFilename={originalFilename}
            onSaveSuccess={() => {
              setHasUnsavedChanges(false);
              setDonoProcessoOriginal(donoProcesso);
            }}
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
        </>
      ) : (
        <Template1
          data={tableData.main}
          dataObs={tableData.obs}
          originalFilename={originalFilename}
          handleChange={(rowIdx, colIdx, value) => {
            setTableData(prev => {
              const newData = prev.main.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, main: newData };
            });
            setHasUnsavedChanges(true);
          }}
          handleChangeObs={(rowIdx, colIdx, value) => {
            setTableData(prev => {
              const newData = prev.obs.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, obs: newData };
            });
            setHasUnsavedChanges(true);
          }}
          headers={template[1].headers}
          headersObs={template[0].headers}
          headersHtml={template[1].headers}
          headersHtmlObs={template[0].headers}
          templateType={1}
          servicosEntrada={servicosEntrada}
          servicoSaida={servicoSaida}
          setServicosEntrada={handleSetServicosEntrada}
          setServicoSaida={handleSetServicoSaida}
          onMoveRowUp={(rowIdx) => handleMoveRowUp(rowIdx, true)}
          onMoveRowDown={(rowIdx) => handleMoveRowDown(rowIdx, true)}
          onInsertRowAbove={(rowIdx) => handleInsertRowAbove(rowIdx, true)}
          onInsertRowBelow={(rowIdx) => handleInsertRowBelow(rowIdx, true)}
          onDeleteRow={(rowIdx) => handleDeleteRowAt(rowIdx, true)}
          onAddRowObs={(rowIdx) => handleInsertRowBelow(rowIdx, false)}
          onDeleteRowObs={(rowIdx) => handleDeleteRowAt(rowIdx, false)}
          atividades={atividades}
          donoProcesso={donoProcesso}
          objetivoProcesso={objetivoProcesso}
          indicadores={indicadores}
          pathFilename={originalFilename}
          fieldNames={mainFieldNames}
          onSaveSuccess={() => setHasUnsavedChanges(false)}
          getTablesHtml={getTablesHtml}
          obsTableRef={obsTableRef}
          mainTableRef={mainTableRef}
        />
      )}
    </div>
  );
}
