import React, { useState, useContext, useEffect } from 'react';
import './novoProcedimento.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context/userContext';
import { generateEditablePdfTemplate1 } from '../utils/pdfGenerate';

export default function NewTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useContext(UserContext);
  
  // Estados para os dados básicos
  const [processName, setProcessName] = useState('');
  const [processFolder, setProcessFolder] = useState('');
  const [nextTableNumber, setNextTableNumber] = useState(null);
  const [manualPrefix, setManualPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verifica se há uma pasta pré-selecionada
  useEffect(() => {
    if (location.state?.preselectedFolder) {
      setProcessFolder(location.state.preselectedFolder);
    }
  }, [location.state]);

  // Buscar o próximo número de tabela quando o componente carregar
  useEffect(() => {
    const fetchNextTableNumber = async () => {
      try {
        // Buscar a árvore de ficheiros para contar tabelas existentes
        const response = await fetch('https://api9001.duckdns.org/files/list-files-tree');
        if (response.ok) {
          const pdfTree = await response.json();
          
          // Se não há pasta selecionada, não pode determinar numeração
          if (!processFolder) {
            setNextTableNumber(null);
            return;
          }
          
          // Extrair o número do processo da pasta selecionada
          let processNumber = null;
          const processMatch = processFolder.match(/^PROCESSO (\d+):/);
          if (processMatch) {
            processNumber = parseInt(processMatch[1], 10);
          } else {
            // Se não segue o padrão PROCESSO X:, usar 0
            processNumber = 0;
          }
          
          // Encontrar a pasta específica na árvore
          const findFolderInTree = (nodes, targetPath) => {
            for (const node of nodes) {
              if (node.type === 'folder' && node.name === targetPath) {
                return node;
              }
              if (node.type === 'folder' && node.children) {
                const found = findFolderInTree(node.children, targetPath);
                if (found) return found;
              }
            }
            return null;
          };
          
          const targetFolder = findFolderInTree(pdfTree, processFolder);
          
          // Extrair números das tabelas existentes na pasta específica
          const tableNumbers = [];
          
          if (targetFolder && targetFolder.children) {
            targetFolder.children.forEach(node => {
              if (node.type === 'file') {
                // Extrair números de diferentes padrões de ficheiros
                let fileNumber = null;
                
                // Padrão XX- (ficheiros sub-processo, ex: 10-, 11-, 30-, 31-)
                const matchDash = node.name.match(/^(\d{1,2})-/);
                if (matchDash) {
                  fileNumber = parseInt(matchDash[1], 10);
                }
                // Padrão X (ficheiros matriz, ex: 1, 2, 3)
                else {
                  const matchSingle = node.name.match(/^(\d{1,2})\s/);
                  if (matchSingle) {
                    fileNumber = parseInt(matchSingle[1], 10);
                  }
                }
                
                // Se encontrou um número, verificar se pertence a este processo
                if (fileNumber !== null) {
                  const fileProcessNumber = Math.floor(fileNumber / 10);
                  
                  // Para números de 1 dígito (1-9), considerar como pertencendo ao processo correspondente
                  if (fileNumber < 10) {
                    if (fileNumber === processNumber) {
                      tableNumbers.push(fileNumber);
                    }
                  }
                  // Para números de 2 dígitos, verificar se começam com o número do processo
                  else if (fileProcessNumber === processNumber) {
                    tableNumbers.push(fileNumber);
                  }
                }
              }
            });
          }
          
          // Debug: mostrar números encontrados
          console.log(`Processo ${processNumber}: números encontrados:`, tableNumbers.sort((a, b) => a - b));
          console.log(`Pasta: "${processFolder}"`);
          console.log(`Total de ficheiros analisados na pasta:`, targetFolder?.children?.length || 0);
          
          // Determinar o próximo número baseado no processo
          let nextNumber;
          if (tableNumbers.length > 0) {
            const maxExisting = Math.max(...tableNumbers);
            nextNumber = maxExisting + 1;
          } else {
            // Se não há ficheiros existentes, começar com o número base do processo
            if (processNumber === 0) {
              // Para processos sem numeração específica, começar com 01
              nextNumber = 1;
            } else {
              // Para processos numerados (PROCESSO 1:, PROCESSO 2:, etc.), 
              // começar com X0 (ex: PROCESSO 3: começa com 30)
              nextNumber = processNumber * 10;
            }
          }
          
          console.log(`Próximo número para processo ${processNumber}:`, nextNumber);
          console.log(`Lógica aplicada: ${tableNumbers.length > 0 ? 'incremento do máximo existente' : 'número base da pasta vazia'}`);
          
          setNextTableNumber(nextNumber);
        } else {
          setNextTableNumber(null);
        }
      } catch (error) {
        console.warn('Erro ao buscar próximo número de tabela:', error);
        setNextTableNumber(null);
      }
    };

    fetchNextTableNumber();
  }, [processFolder]); // Reexecuta quando a pasta muda

  // Estados para a tabela de observações (5 linhas por defeito)
  const [observacoes, setObservacoes] = useState([
    [''],
    [''],
    [''],
    [''],
    ['']
  ]);

  // Estados para a tabela principal (6 linhas por defeito)
  const [tabelaPrincipal, setTabelaPrincipal] = useState([
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', '']
  ]);

  // Headers da tabela principal
  const headers = [
    'Fluxo\ndas Ações',
    'Descrição', 
    'Responsável',
    'Documentos\nAssociados',
    'Instruções\nde Trabalho'
  ];

  const headersObs = ['Observações'];

  // Função para atualizar observações
  const handleObservacoesChange = (rowIdx, value) => {
    setObservacoes(prev => {
      const novo = [...prev];
      novo[rowIdx] = [value];
      return novo;
    });
  };

  // Função para atualizar tabela principal
  const handleTabelaPrincipalChange = (rowIdx, colIdx, value) => {
    setTabelaPrincipal(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
  };

  // Função para adicionar linha às observações
  const addObservacaoRow = () => {
    setObservacoes(prev => [...prev, ['']]);
  };

  // Função para remover linha das observações
  const removeObservacaoRow = (index) => {
    if (observacoes.length > 1) {
      setObservacoes(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para adicionar linha à tabela principal
  const addTabelaPrincipalRow = () => {
    setTabelaPrincipal(prev => [...prev, ['', '', '', '', '']]);
  };

  // Função para remover linha da tabela principal
  const removeTabelaPrincipalRow = (index) => {
    if (tabelaPrincipal.length > 1) {
      setTabelaPrincipal(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para criar a tabela (Template 1)
  const handleCreateTable = async () => {
    // Validações
    if (!processName.trim()) {
      setError('Nome da matriz é obrigatório');
      return;
    }

    if (!processFolder.trim()) {
      setError('Nome da pasta é obrigatório');
      return;
    }

    if (nextTableNumber === null && !manualPrefix.trim()) {
      setError('Aguarde o carregamento do número da tabela ou insira um prefixo manual...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Gerar o PDF com Template 1
      console.log('Gerando PDF Template 1...');
      const pdfBytes = await generateEditablePdfTemplate1(
        tabelaPrincipal, 
        headers, 
        observacoes, 
        headersObs
      );

      // 2. Preparar dados para envio
      const formData = new FormData();
      
      // Nome do ficheiro - usar prefixo manual se fornecido, senão usar numeração automática
      let fileName;
      if (manualPrefix.trim()) {
        fileName = `${manualPrefix.trim()} ${processName.trim()}.pdf`;
      } else {
        const formattedNumber = nextTableNumber.toString().padStart(2, '0');
        fileName = `${formattedNumber} ${processName.trim()}.pdf`;
      }
      const folderPath = processFolder.trim();
      
      // Criar blob do PDF
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('file', pdfBlob, fileName);
      formData.append('filename', fileName);
      formData.append('folders', JSON.stringify([folderPath]));
      
      // Dados específicos do Template 1
      formData.append('mainTableData', JSON.stringify(tabelaPrincipal));
      formData.append('obsTableData', JSON.stringify(observacoes));

      console.log('Enviando dados para o backend...');

      // 3. Enviar para o backend
      const response = await fetch('https://api9001.duckdns.org/files/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao criar procedimento');
      }

      console.log('Tabela criada com sucesso!');
      
      // 4. Redirecionar para a lista de PDFs
      navigate('/file');
      
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
      setError('Erro ao criar procedimento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="novo-procedimento-container">
      <h2>Criar novo procedimento</h2>
      {error && (
        <div className="novo-procedimento-error">
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Nome do Procedimento:
        </label>
        <input
          type="text"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          placeholder="Ex: Gestão de Recursos Humanos"
          className="novo-procedimento-input"
        />
        <small style={{ color: '#666' }}>
          {processFolder
            ? (() => {
                let prefix;
                if (manualPrefix.trim()) {
                  prefix = manualPrefix.trim();
                } else if (nextTableNumber !== null) {
                  prefix = nextTableNumber.toString().padStart(2, '0');
                } else {
                  return 'Aguardando carregamento do número...';
                }
                return `Nome do ficheiro será: Procedimento ${prefix} ${processName || '[Nome da Matriz]'}.pdf`;
              })()
            : 'Selecione uma pasta para ver o nome do ficheiro'
          }
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Prefixo do Ficheiro (opcional):
        </label>
        <input
          type="text"
          value={manualPrefix}
          onChange={(e) => setManualPrefix(e.target.value)}
          placeholder="Ex: 01, 02, 03, 04, etc. (deixe vazio para numeração automática)"
          className="novo-procedimento-input"
        />
        <small style={{ color: '#666' }}>
          Se não especificar, será usado o próximo número disponível automaticamente
        </small>
      </div>

      {/* Seções do Documento (substitui Tabela de Observações) */}
      <div style={{ marginBottom: '20px' }}>
        {/* 1. Objetivos */}
        <div style={{ marginBottom: '15px' }}>
          <label className="novo-procedimento-label" style={{ color: '#333' }}>
            1. Objetivos:
          </label>
          <textarea
            value={observacoes[0][0]}
            onChange={(e) => handleObservacoesChange(0, e.target.value)}
            placeholder="Digite os objetivos do documento..."
            rows={3}
            className="novo-procedimento-textarea"
          />
        </div>

        {/* 2. Campo de Aplicação */}
        <div style={{ marginBottom: '15px' }}>
          <label className="novo-procedimento-label" style={{ color: '#333' }}>
            2. Campo de Aplicação:
          </label>
          <textarea
            value={observacoes[1][0]}
            onChange={(e) => handleObservacoesChange(1, e.target.value)}
            placeholder="Digite o campo de aplicação..."
            rows={3}
            className="novo-procedimento-textarea"
          />
        </div>

        {/* 3. Definições */}
        <div style={{ marginBottom: '15px' }}>
          <label className="novo-procedimento-label" style={{ color: '#333' }}>
            3. Definições:
          </label>
          <textarea
            value={observacoes[2][0]}
            onChange={(e) => handleObservacoesChange(2, e.target.value)}
            placeholder="Digite as definições relevantes..."
            rows={3}
            className="novo-procedimento-textarea"
          />
        </div>

        {/* 4. Abreviaturas */}
        <div style={{ marginBottom: '15px' }}>
          <label className="novo-procedimento-label" style={{ color: '#333' }}>
            4. Abreviaturas:
          </label>
          <textarea
            value={observacoes[3][0]}
            onChange={(e) => handleObservacoesChange(3, e.target.value)}
            placeholder="Digite as abreviaturas utilizadas..."
            rows={3}
            className="novo-procedimento-textarea"
          />
        </div>

        {/* 5. Observações */}
        <div style={{ marginBottom: '15px' }}>
          <label className="novo-procedimento-label" style={{ color: '#333' }}>
            5. Observações:
          </label>
          <textarea
            value={observacoes[4][0]}
            onChange={(e) => handleObservacoesChange(4, e.target.value)}
            placeholder="Digite observações adicionais..."
            rows={3}
            className="novo-procedimento-textarea"
          />
        </div>
      </div>

      {/* Tabela Principal */}
      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Tabela Principal:
        </label>
        <div className="novo-procedimento-table-wrapper">
          <table className="novo-procedimento-table">
            <thead>
              <tr>
                <th>Fluxo das Ações</th>
                <th>Descrição</th>
                <th>Responsável</th>
                <th>Documentos Associados</th>
                <th>Instruções de trabalho</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tabelaPrincipal.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx}>
                      <textarea
                        value={cell}
                        onChange={(e) => handleTabelaPrincipalChange(rowIdx, colIdx, e.target.value)}
                        className="novo-procedimento-textarea"
                        placeholder={headers[colIdx]?.replace('\n', ' ')}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    {tabelaPrincipal.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTabelaPrincipalRow(rowIdx)}
                        className="novo-procedimento-button novo-procedimento-remove"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addTabelaPrincipalRow}
          className="novo-procedimento-button novo-procedimento-add-row"
        >
          Adicionar Linha
        </button>
      </div>

      {/* Botões de ação */}
      <div className="novo-procedimento-actions">
        <button
          type="button"
          onClick={() => navigate('/file')}
          className="novo-procedimento-button novo-procedimento-cancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreateTable}
          disabled={loading}
          className="novo-procedimento-button"
        >
          {loading ? 'A criar...' : 'Criar Procedimento'}
        </button>
      </div>
    </div>
  );
}
