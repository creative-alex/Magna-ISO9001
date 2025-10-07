import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import AIAssistant from "./AIAssistant/AIAssistant";
import TabelaPdf from "../pages/tableDisplay";
import Template1 from "./templates/TabelaTemplate1";
import ExportPdfButton from "./Buttons/exportPdf";
import PreviewPdfButton from "./Buttons/previewPDF";

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
  // Estado para histórico de alterações - só adiciona quando guarda
  const [history, setHistory] = useState([]);
  console.log('🔍 DEBUG Estado do histórico:', history);
  const { user } = useContext(UserContext);
  const { filename } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Context do usuário para verificar permissões
  const { username } = useContext(UserContext);

  const originalFilename =
    location?.state?.originalFilename
      ? location.state.originalFilename
      : decodeURIComponent(filename || "").replace(/__/g, '/').replace(/-/g, ' ');

  // Extrai o nome do processo (antes do primeiro "/")
  const nomeProcesso = originalFilename ? originalFilename.split('/')[0] : "";

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
const [indicadores, setIndicadores] = useState(() => {
  // Inicializa baseado no template
  if (isTemplate2) {
    return ["", "", ""]; // Manter como array para Template2 também para permitir dinamismo
  } else {
    return ["", "", ""];
  }
});
const [donoProcesso, setDonoProcesso] = useState("");
const [donoProcessoOriginal, setDonoProcessoOriginal] = useState("");
const [objetivoProcesso, setObjetivoProcesso] = useState("");
const [objetivoProcessoOriginal, setObjetivoProcessoOriginal] = useState("");
const [servicosEntrada, setServicosEntrada] = useState("");
const [servicosEntradaOriginal, setServicosEntradaOriginal] = useState("");
const [servicoSaida, setServicoSaida] = useState("");
const [servicoSaidaOriginal, setServicoSaidaOriginal] = useState("");
const [obsTableOriginal, setObsTableOriginal] = useState([]);
const [mainTableOriginal, setMainTableOriginal] = useState([]);
const [atividadesOriginal, setAtividadesOriginal] = useState([]);
const [indicadoresOriginal, setIndicadoresOriginal] = useState([]);
const [funcionarios, setFuncionarios] = useState([]);

// Estado para controlar se as tabelas são editáveis (inicialmente false)
const [isEditable, setIsEditable] = useState(false);

// Receber canEdit do state (calculado em selectPdf) ou fallback para false
const canEditFromState = location?.state?.canEdit;

// Receber isSuperAdmin do state (calculado em selectPdf) ou fallback
const isSuperAdminFromState = location?.state?.isSuperAdmin;

// Função utilitária para verificar se um usuário está na lista de donos do processo
const isUserOwner = (donoProcessoString, username) => {
  if (!donoProcessoString || !username) return false;
  const donosArray = donoProcessoString.split(',').map(nome => nome.trim()).filter(nome => nome);
  return donosArray.includes(username);
};

// Fallback: verificar permissões localmente se não vier do state
const isAdmin = username === "superadmin" || username === "SuperAdmin";
const canEditFallback = isAdmin || isUserOwner(donoProcesso, username);

// Usar o valor do state se disponível, senão usar fallback
const canEdit = canEditFromState !== undefined ? canEditFromState : canEditFallback;
const isSuperAdmin = isSuperAdminFromState !== undefined ? isSuperAdminFromState : isAdmin;

// Carregar funcionários do backend
useEffect(() => {
  const carregarFuncionarios = async () => {
    try {
      const response = await fetch("https://api9001.duckdns.org/users/getAllUsers");
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
    // Cleanup dos timeouts
    clearTimeout(window.atividadesTimeout);
    clearTimeout(window.mainTableTimeout);
    clearTimeout(window.obsTableTimeout);
    clearTimeout(window.template2TableTimeout);
  };
}, [hasUnsavedChanges]);



  // Handlers para Template2 - removido histórico automático
  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    setAtividades(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
    setHasUnsavedChanges(true);
  };
  const handleIndicadoresChange = (field, value) => {
    let index = field;
    
    if (isTemplate2) {
      // Para Template2, sempre trata como array mas converte índices se necessário
      if (typeof field === 'string' && field.startsWith('indicadores_r')) {
        // Se receber chave de objeto, converte para índice
        const match = field.match(/indicadores_r(\d+)/);
        if (match) {
          index = parseInt(match[1]) - 1;
          
          setIndicadores(prev => {
            const novo = [...prev];
            novo[index] = value;
            return novo;
          });
        }
      } else {
        // Se receber índice numérico diretamente
        setIndicadores(prev => {
          const novo = [...prev];
          novo[field] = value;
          return novo;
        });
      }
    } else {
      // Para Template1, trata como array
      setIndicadores(prev => {
        const novo = [...prev];
        novo[field] = value;
        return novo;
      });
    }
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

  // Funções para manipulação de indicadores
  const handleMoveIndicadorUp = (rowIdx) => {
    if (rowIdx > 0) {
      setIndicadores(prev => {
        const newIndicadores = [...prev];
        const [movedItem] = newIndicadores.splice(rowIdx, 1);
        newIndicadores.splice(rowIdx - 1, 0, movedItem);
        return newIndicadores;
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleMoveIndicadorDown = (rowIdx) => {
    if (rowIdx < indicadores.length - 1) {
      setIndicadores(prev => {
        const newIndicadores = [...prev];
        const [movedItem] = newIndicadores.splice(rowIdx, 1);
        newIndicadores.splice(rowIdx + 1, 0, movedItem);
        return newIndicadores;
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleInsertIndicadorAbove = (rowIdx) => {
    setIndicadores(prev => {
      const newIndicadores = [...prev];
      newIndicadores.splice(rowIdx, 0, "");
      return newIndicadores;
    });
    setHasUnsavedChanges(true);
  };

  const handleInsertIndicadorBelow = (rowIdx) => {
    setIndicadores(prev => {
      const newIndicadores = [...prev];
      newIndicadores.splice(rowIdx + 1, 0, "");
      return newIndicadores;
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteIndicador = (rowIdx) => {
    if (indicadores.length > 1) {
      setIndicadores(prev => {
        const newIndicadores = [...prev];
        newIndicadores.splice(rowIdx, 1);
        return newIndicadores;
      });
      setHasUnsavedChanges(true);
    }
  };

  // Função para atualizar donoProcesso no backend
  const updateDonoProcessoBackend = async (newDonoProcesso) => {
    try {
      console.log("Atualizando donoProcesso no backend:", { originalFilename, nomeProcesso, newDonoProcesso });
      
      const response = await fetch("https://api9001.duckdns.org/files/update-dono-processo", {
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
    if (donoProcesso !== newDonoProcesso) {
      // addHistoryEntry('Modificou', 'Dono do Processo', donoProcesso, newDonoProcesso); // REMOVIDO: só grava histórico ao guardar
    }
    
    // Atualiza o estado local
    setDonoProcesso(newDonoProcesso);
    setHasUnsavedChanges(true);
    
    // Atualiza no backend
    await updateDonoProcessoBackend(newDonoProcesso);
  };

  // Wrappers para outros setters que marcam mudanças
  const handleSetObjetivoProcesso = (value) => {
    if (objetivoProcesso !== value) {
      // addHistoryEntry('Modificou', 'Objetivo do Processo', objetivoProcesso, value); // REMOVIDO: só grava histórico ao guardar
    }
    
    setObjetivoProcesso(value);
    setHasUnsavedChanges(true);
  };

  const handleSetServicosEntrada = (value) => {
    if (servicosEntrada !== value) {
      // addHistoryEntry('Modificou', 'Serviços de Entrada', servicosEntrada, value); // REMOVIDO: só grava histórico ao guardar
    }
    
    setServicosEntrada(value);
    setHasUnsavedChanges(true);
  };

  const handleSetServicoSaida = (value) => {
    if (servicoSaida !== value) {
      // addHistoryEntry('Modificou', 'Serviço de Saída', servicoSaida, value); // REMOVIDO: só grava histórico ao guardar
    }
    
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
    
    // Sempre inicializa indicadores como array para ambos os templates
    setIndicadores(["", "", ""]);
    
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

  // Carregar histórico do backend quando o componente é montado
  useEffect(() => {
    if (nomeProcesso) {
      loadHistoryFromBackend();
    }
  }, [nomeProcesso]); // Recarrega quando nomeProcesso muda

  // Buscar dados do PDF selecionado (opcional, pode remover se não usar)
  useEffect(() => {
    if (!filename) {
      return;
    }

    let currentTemplate = template;

    fetch("https://api9001.duckdns.org/files/pdf-form-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: encodeURIComponent(originalFilename) }),
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
          
          // Definir valores originais das tabelas para comparação
          setObsTableOriginal(JSON.parse(JSON.stringify(newState.obs)));
          setMainTableOriginal(JSON.parse(JSON.stringify(newState.main)));
          
          return newState;
        });

        // Atualiza os estados extra do Template2
        if (currentTemplate === tabelasTemplate2) {
          const donoProcessoValue = formData.dono_processo || "";
          setDonoProcesso(donoProcessoValue);
          setDonoProcessoOriginal(donoProcessoValue); // Definir valor original
          
          const objetivoProcessoValue = formData.objetivo_processo || "";
          setObjetivoProcesso(objetivoProcessoValue);
          setObjetivoProcessoOriginal(objetivoProcessoValue); // Definir valor original
          
          // Busca por linhas adicionais de atividades dinâmicamente
          const atividadeFields = Object.keys(formData).filter(f => /^atividades_r\d+_c\d+$/.test(f));
          const atividadeRowNumbers = atividadeFields.map(f => parseInt(f.match(/^atividades_r(\d+)_c\d+$/)[1], 10));
          const maxAtividadeRow = Math.max(...atividadeRowNumbers, 4);
          
          const novasAtividades = [];
          for (let row = 1; row <= maxAtividadeRow; row++) {
            novasAtividades.push([
              formData[`atividades_r${row}_c1`] || "",
              formData[`atividades_r${row}_c2`] || "",
              formData[`atividades_r${row}_c3`] || "",
              formData[`atividades_r${row}_c4`] || "",
              formData[`atividades_r${row}_c5`] || "",
              formData[`atividades_r${row}_c6`] || "",
            ]);
          }
          
          setAtividades(novasAtividades);
          setAtividadesOriginal(JSON.parse(JSON.stringify(novasAtividades))); // Definir valor original
          
          // Busca por indicadores dinamicamente
          const indicadorFields = Object.keys(formData).filter(f => /^indicadores_r\d+$/.test(f));
          const indicadorNumbers = indicadorFields.map(f => parseInt(f.match(/^indicadores_r(\d+)$/)[1], 10));
          const maxIndicadorNumber = Math.max(...indicadorNumbers, 3);
          
          const novosIndicadores = [];
          for (let i = 1; i <= maxIndicadorNumber; i++) {
            novosIndicadores.push(formData[`indicadores_r${i}`] || "");
          }
          
          setIndicadores(novosIndicadores);
          setIndicadoresOriginal(JSON.parse(JSON.stringify(novosIndicadores))); // Definir valor original
          
          const servicosEntradaValue = formData.servicos_entrada || "";
          setServicosEntrada(servicosEntradaValue);
          setServicosEntradaOriginal(servicosEntradaValue); // Definir valor original
          
          const servicoSaidaValue = formData.servico_saida || "";
          setServicoSaida(servicoSaidaValue);
          setServicoSaidaOriginal(servicoSaidaValue); // Definir valor original
        } else {
          // Para Template 1, também carrega os serviços se existirem
          const servicosEntradaValue = formData.servicos_entrada || "";
          setServicosEntrada(servicosEntradaValue);
          setServicosEntradaOriginal(servicosEntradaValue); // Definir valor original
          
          const servicoSaidaValue = formData.servico_saida || "";
          setServicoSaida(servicoSaidaValue);
          setServicoSaidaOriginal(servicoSaidaValue); // Definir valor original
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

  // Função para adicionar registo ao histórico
  const addHistoryEntry = (acao, descricao, valorAnterior = null, valorNovo = null) => {
    console.log('🔍 DEBUG addHistoryEntry chamada:', { acao, descricao, valorAnterior, valorNovo });
    
    const data = new Date().toLocaleString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    let descricaoCompleta = descricao;
    if (valorAnterior !== null && valorNovo !== null) {
      // Não registra se os valores são idênticos
      if (valorAnterior === valorNovo) {
        console.log('🔍 DEBUG Valores idênticos, não registrando no histórico:', { valorAnterior, valorNovo });
        return;
      }
      
      const anteriorTruncado = valorAnterior.length > 30 ? valorAnterior.substring(0, 27) + '...' : valorAnterior;
      const novoTruncado = valorNovo.length > 30 ? valorNovo.substring(0, 27) + '...' : valorNovo;
      descricaoCompleta = `${descricao}: de "${anteriorTruncado}" para "${novoTruncado}"`;
    }
    
    // Verifica se já existe uma entrada idêntica recente (últimos 5 segundos)
    const agora = Date.now();
    const entradaRecente = history.find(entry => {
      const entryTime = new Date(entry.data.replace(' às ', ' ').replace(' de ', '/').replace(' de ', '/')).getTime();
      return (agora - entryTime < 5000) && 
             entry.utilizador === (username || user?.name || user?.email || 'Utilizador') &&
             entry.acao === acao &&
             entry.descricao === descricaoCompleta;
    });
    
    if (entradaRecente) {
      console.log('🔍 DEBUG Entrada duplicada detectada, não adicionando ao histórico');
      return;
    }
    
    const novaEntrada = {
      data,
      utilizador: username || user?.name || user?.email || 'Utilizador',
      acao,
      descricao: descricaoCompleta
    };
    
    console.log('🔍 DEBUG Nova entrada de histórico criada:', novaEntrada);
    
    setHistory(prev => {
      const novoHistorico = [...prev, novaEntrada];
      console.log('🔍 DEBUG Histórico atualizado:', novoHistorico);
      return novoHistorico;
    });
  };

  // Função para limpar o histórico (apenas para debug)
  const clearHistory = () => {
    if (window.confirm('Tem a certeza que quer limpar todo o histórico? Esta ação não pode ser desfeita.')) {
      setHistory([]);
      console.log('Histórico limpo pelo utilizador:', username);
    }
  };

  // Nova função para salvar histórico no backend
  const saveHistoryToBackend = async (historyData) => {
    try {
      console.log('💾 Salvando histórico no backend para:', nomeProcesso);
      
      const response = await fetch("https://api9001.duckdns.org/files/save-process-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          processId: nomeProcesso, 
          history: historyData 
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Histórico salvo no backend:', result);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar histórico no backend:', error);
      return false;
    }
  };

  // Nova função para carregar histórico do backend
  const loadHistoryFromBackend = async () => {
    try {
      if (!nomeProcesso) return;
      
      console.log('📥 Carregando histórico do backend para:', nomeProcesso);
      
      const response = await fetch("https://api9001.duckdns.org/files/get-process-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId: nomeProcesso }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.exists && result.data && result.data.history) {
        console.log('✅ Histórico carregado do backend:', result.data.history.length, 'entradas');
        setHistory(result.data.history);
      } else {
        console.log('ℹ️ Nenhum histórico encontrado no backend para:', nomeProcesso);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico do backend:', error);
    }
  };

  // Função para guardar alterações e registar histórico detalhado
  function handleSave() {
    const agora = new Date().toLocaleString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Lista das alterações específicas feitas
    const alteracoes = [];
    
    // Verificar mudanças no dono do processo
    if (donoProcesso !== donoProcessoOriginal) {
      alteracoes.push(`Dono do Processo: de "${donoProcessoOriginal || 'vazio'}" para "${donoProcesso}"`);
    }
    
    // Verificar mudanças no objetivo do processo
    if (objetivoProcesso !== objetivoProcessoOriginal) {
      alteracoes.push(`Objetivo do Processo: de "${objetivoProcessoOriginal || 'vazio'}" para "${objetivoProcesso}"`);
    }
    
    // Verificar mudanças nos serviços de entrada
    if (servicosEntrada !== servicosEntradaOriginal) {
      alteracoes.push(`Serviços de Entrada: de "${servicosEntradaOriginal || 'vazio'}" para "${servicosEntrada}"`);
    }
    
    // Verificar mudanças no serviço de saída
    if (servicoSaida !== servicoSaidaOriginal) {
      alteracoes.push(`Serviço de Saída: de "${servicoSaidaOriginal || 'vazio'}" para "${servicoSaida}"`);
    }
    
    // Verificar mudanças na tabela de observações
    if (obsTableOriginal.length > 0 && tableData.obs) {
      for (let rowIdx = 0; rowIdx < Math.max(obsTableOriginal.length, tableData.obs.length); rowIdx++) {
        const linhaOriginal = obsTableOriginal[rowIdx] || [];
        const linhaAtual = tableData.obs[rowIdx] || [];
        
        for (let colIdx = 0; colIdx < Math.max(linhaOriginal.length, linhaAtual.length); colIdx++) {
          const valorOriginal = linhaOriginal[colIdx] || '';
          const valorAtual = linhaAtual[colIdx] || '';
          
          if (valorOriginal !== valorAtual) {
            alteracoes.push(`Tabela Observações (linha ${rowIdx + 1}): de "${valorOriginal || 'vazio'}" para "${valorAtual}"`);
          }
        }
      }
    }
    
    // Verificar mudanças na tabela principal
    if (mainTableOriginal.length > 0 && tableData.main) {
      for (let rowIdx = 0; rowIdx < Math.max(mainTableOriginal.length, tableData.main.length); rowIdx++) {
        const linhaOriginal = mainTableOriginal[rowIdx] || [];
        const linhaAtual = tableData.main[rowIdx] || [];
        
        for (let colIdx = 0; colIdx < Math.max(linhaOriginal.length, linhaAtual.length); colIdx++) {
          const valorOriginal = linhaOriginal[colIdx] || '';
          const valorAtual = linhaAtual[colIdx] || '';
          
          if (valorOriginal !== valorAtual) {
            // Definir nomes das colunas baseado no template
            const nomeColuna = template === tabelasTemplate2 
              ? ['Etapa', 'Atividade', 'Responsável', 'Documentos', 'Instruções', 'Observações'][colIdx] || `Coluna ${colIdx + 1}`
              : ['Fluxo das Ações', 'Descrição', 'Responsável', 'Documentos Associados', 'Instruções de Trabalho'][colIdx] || `Coluna ${colIdx + 1}`;
            
            alteracoes.push(`${nomeColuna} (linha ${rowIdx + 1}): de "${valorOriginal || 'vazio'}" para "${valorAtual}"`);
          }
        }
      }
    }
    
    // Verificar mudanças nas atividades (Template 2)
    if (template === tabelasTemplate2 && atividadesOriginal.length > 0 && atividades) {
      for (let rowIdx = 0; rowIdx < Math.max(atividadesOriginal.length, atividades.length); rowIdx++) {
        const linhaOriginal = atividadesOriginal[rowIdx] || [];
        const linhaAtual = atividades[rowIdx] || [];
        
        for (let colIdx = 0; colIdx < Math.max(linhaOriginal.length, linhaAtual.length); colIdx++) {
          const valorOriginal = linhaOriginal[colIdx] || '';
          const valorAtual = linhaAtual[colIdx] || '';
          
          if (valorOriginal !== valorAtual) {
            const nomeColunaAtividade = ['Etapa', 'Atividade', 'Responsável', 'Documentos', 'Instruções', 'Observações'][colIdx] || `Coluna ${colIdx + 1}`;
            alteracoes.push(`Atividades - ${nomeColunaAtividade} (linha ${rowIdx + 1}): de "${valorOriginal || 'vazio'}" para "${valorAtual}"`);
          }
        }
      }
    }
    
    // Verificar mudanças nos indicadores (Template 2)
    if (template === tabelasTemplate2 && indicadoresOriginal.length > 0 && indicadores) {
      for (let idx = 0; idx < Math.max(indicadoresOriginal.length, indicadores.length); idx++) {
        const valorOriginal = indicadoresOriginal[idx] || '';
        const valorAtual = indicadores[idx] || '';
        
        if (valorOriginal !== valorAtual) {
          alteracoes.push(`Indicador ${idx + 1}: de "${valorOriginal || 'vazio'}" para "${valorAtual}"`);
        }
      }
    }
    
    // Se há alterações específicas, regista-las
    if (alteracoes.length > 0) {
      alteracoes.forEach(alteracao => {
        addHistoryEntry('Modificou', alteracao);
      });
    }
    
    // Sempre adiciona uma entrada geral de salvamento
    addHistoryEntry('Guardou', `Documento atualizado em ${agora}`);
    
    setHasUnsavedChanges(false);
    
    // Salvar histórico no backend após atualizar estado local
    setTimeout(() => {
      setHistory(currentHistory => {
        saveHistoryToBackend(currentHistory);
        return currentHistory;
      });
    }, 100); // Pequeno delay para garantir que o estado foi atualizado
    
    // Atualizar valores originais após salvar
    setDonoProcessoOriginal(donoProcesso);
    setObjetivoProcessoOriginal(objetivoProcesso);
    setServicosEntradaOriginal(servicosEntrada);
    setServicoSaidaOriginal(servicoSaida);
    setObsTableOriginal(JSON.parse(JSON.stringify(tableData.obs || [])));
    setMainTableOriginal(JSON.parse(JSON.stringify(tableData.main || [])));
    
    // Atualizar valores originais específicos do Template 2
    if (template === tabelasTemplate2) {
      setAtividadesOriginal(JSON.parse(JSON.stringify(atividades || [])));
      setIndicadoresOriginal(JSON.parse(JSON.stringify(indicadores || [])));
    }
  }

  // Função para obter o HTML das tabelas para exportação
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
            const rowData = tableData.main[rowIdx];
            const value = rowData ? rowData[colIdx] : '';
            console.log(`🔍 DEBUG PDF - Linha ${rowIdx}, Coluna ${colIdx} (Instruções):`, value);
            console.log(`🔍 DEBUG PDF - Row Data Completa:`, rowData);
            console.log(`🔍 DEBUG PDF - tableData.main completo:`, tableData.main);
            cell.innerHTML = value.split('\n').join('<br>');
          }
        });
      });
      
      mainTableHtml = mainTableClone.outerHTML;
    }

    if (obsTableRef.current) {
      obsTableHtml = obsTableRef.current.outerHTML;
    }

    // Adiciona tabela de histórico invisível (só aparece no PDF)
    let historyTableHtml = "";
    if (history && history.length > 0) {
      historyTableHtml = `
        <div style="display: none; page-break-before: always;" class="history-section-for-pdf">
          <h3 style="font-size: 14px; font-weight: bold; margin: 15px 0 10px 0;">Histórico de Alterações</h3>
          <table border="1" cellpadding="3" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9px; table-layout: fixed;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 4px; border: 1px solid #000; font-weight: bold; width: 15%;">Data</th>
                <th style="padding: 4px; border: 1px solid #000; font-weight: bold; width: 15%;">Utilizador</th>
                <th style="padding: 4px; border: 1px solid #000; font-weight: bold; width: 15%;">Ação</th>
                <th style="padding: 4px; border: 1px solid #000; font-weight: bold; width: 55%;">Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(item => `
                <tr>
                  <td style="padding: 4px; border: 1px solid #000; word-wrap: break-word; overflow-wrap: break-word;">${item.data || ''}</td>
                  <td style="padding: 4px; border: 1px solid #000; word-wrap: break-word; overflow-wrap: break-word;">${item.utilizador || ''}</td>
                  <td style="padding: 4px; border: 1px solid #000; word-wrap: break-word; overflow-wrap: break-word;">${item.acao || ''}</td>
                  <td style="padding: 4px; border: 1px solid #000; word-wrap: break-word; overflow-wrap: break-word; max-width: 300px;">${(item.descricao || '').replace(/"/g, '&quot;')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return {
      mainTableHtml: mainTableHtml + historyTableHtml,
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
            isEditable={isEditable}
            setIsEditable={setIsEditable}
            canEdit={canEdit}
            isSuperAdmin={isSuperAdmin}
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
            onMoveIndicadorUp={handleMoveIndicadorUp}
            onMoveIndicadorDown={handleMoveIndicadorDown}
            onInsertIndicadorAbove={handleInsertIndicadorAbove}
            onInsertIndicadorBelow={handleInsertIndicadorBelow}
            onDeleteIndicador={handleDeleteIndicador}
            pathFilename={originalFilename}
            onSaveSuccess={handleSave}
            history={history}
            clearHistory={clearHistory}
            handleChange={
              (rowIdx, colIdx, value) => {
                const valorAnterior = tableData.main[rowIdx] ? tableData.main[rowIdx][colIdx] : '';
                
                setTableData(prev => {
                  const newData = prev.main.map(row => [...row]);
                  newData[rowIdx][colIdx] = value;
                  return { ...prev, main: newData };
                });
                setHasUnsavedChanges(true);
                
                // Debounce removido - histórico só é criado ao guardar
                // clearTimeout(window.template2TableTimeout);
                // window.template2TableTimeout = setTimeout(() => {
                //   if (valorAnterior !== value) {
                //     addHistoryEntry('Modificou', `Tabela principal (linha ${rowIdx + 1}, coluna ${colIdx + 1})`, valorAnterior, value);
                //   }
                // }, 500);
              }
            }           
          />
        </>
      ) : (
        <Template1
          isEditable={isEditable}
          setIsEditable={setIsEditable}
          canEdit={canEdit}
          useNewAttachmentManager={true} // Usa o novo gerenciador de anexos
          data={tableData.main}
          dataObs={tableData.obs}
          originalFilename={originalFilename}
          handleChange={(rowIdx, colIdx, value) => {
            const valorAnterior = tableData.main[rowIdx] ? tableData.main[rowIdx][colIdx] : '';
            
            setTableData(prev => {
              const newData = prev.main.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, main: newData };
            });
            setHasUnsavedChanges(true);
            
            // Debounce removido - histórico só é criado ao guardar
            // clearTimeout(window.mainTableTimeout);
            // window.mainTableTimeout = setTimeout(() => {
            //   if (valorAnterior !== value) {
            //     const colunas = ['Fluxo das Ações', 'Descrição', 'Responsável', 'Documentos Associados', 'Instruções de Trabalho'];
            //     const nomeColuna = colunas[colIdx] || `Coluna ${colIdx + 1}`;
            //     addHistoryEntry('Modificou', `${nomeColuna} (linha ${rowIdx + 1})`, valorAnterior, value);
            //   }
            // }, 500);
          }}
          handleChangeObs={(rowIdx, colIdx, value) => {
            const valorAnterior = tableData.obs[rowIdx] ? tableData.obs[rowIdx][colIdx] : '';
            
            setTableData(prev => {
              const newData = prev.obs.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, obs: newData };
            });
            setHasUnsavedChanges(true);
            
            // Debounce removido - histórico só é criado ao guardar
            // clearTimeout(window.obsTableTimeout);
            // window.obsTableTimeout = setTimeout(() => {
            //   if (valorAnterior !== value) {
            //     const secoes = ['Objetivos', 'Âmbito', 'Referências Normativas', 'Termos e Definições', 'Procedimento'];
            //     const nomeSecao = secoes[rowIdx] || `Seção ${rowIdx + 1}`;
            //     addHistoryEntry('Modificou', nomeSecao, valorAnterior, value);
            //   }
            // }, 500);
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
          history={history}
          clearHistory={clearHistory}
  />
      )}
      
      {/* AI Assistant para continuar tutorial */}
      <AIAssistant 
        fileTree={[]}
        searchTerm=""
        username={username}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        processOwners={{}}
        onSuggestion={() => {}}
      />
    </div>
  );
}
