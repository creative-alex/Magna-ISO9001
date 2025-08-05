import React, { useState, useContext, useEffect } from 'react';
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
  const [servicosEntrada, setServicosEntrada] = useState('');
  const [servicoSaida, setServicoSaida] = useState('');
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
        // Buscar a árvore de PDFs para contar tabelas existentes
        const response = await fetch('http://192.168.1.219:8080/files/list-pdfs-tree');
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
          
          // Determinar o próximo número baseado no processo
          let nextNumber;
          if (tableNumbers.length > 0) {
            const maxExisting = Math.max(...tableNumbers);
            nextNumber = maxExisting + 1;
          } else {
            // Se não há ficheiros existentes, começar com o número base do processo
            nextNumber = processNumber === 0 ? 0 : processNumber * 10;
          }
          
          console.log(`Próximo número para processo ${processNumber}:`, nextNumber);
          
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

    if (nextTableNumber === null) {
      setError('Aguarde o carregamento do número da tabela...');
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
      
      // Nome do ficheiro com numeração sequencial de 2 dígitos
      const formattedNumber = nextTableNumber.toString().padStart(2, '0');
      const fileName = `${formattedNumber} ${processName.trim()}.pdf`;
      const folderPath = processFolder.trim();
      
      // Criar blob do PDF
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('file', pdfBlob, fileName);
      formData.append('filename', fileName);
      formData.append('folders', JSON.stringify([folderPath]));
      
      // Dados específicos do Template 1
      formData.append('mainTableData', JSON.stringify(tabelaPrincipal));
      formData.append('obsTableData', JSON.stringify(observacoes));
      formData.append('servicos_entrada', servicosEntrada || "");
      formData.append('servico_saida', servicoSaida || "");

      console.log('Enviando dados para o backend...');

      // 3. Enviar para o backend
      const response = await fetch('http://192.168.1.219:8080/files/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao criar tabela');
      }

      console.log('Tabela criada com sucesso!');
      
      // 4. Redirecionar para a lista de PDFs
      navigate('/file');
      
    } catch (error) {
      console.error('Erro ao criar tabela:', error);
      setError('Erro ao criar tabela: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Criar Nova Tabela (Template 1)</h2>      
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}
    
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Nome do Processamento:
        </label>
        <input
          type="text"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          placeholder="Ex: Gestão de Recursos Humanos"
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <small style={{ color: '#666' }}>
          {nextTableNumber !== null && processFolder
            ? `Nome do ficheiro será: ${nextTableNumber.toString().padStart(2, '0')} ${processName || '[Nome da Matriz]'}.pdf`
            : processFolder 
              ? 'Aguardando carregamento do número...'
              : 'Selecione uma pasta para ver o nome do ficheiro'
          }
        </small>
      </div>

      {/* Serviços de Entrada e Saída (opcionais) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Serviços de Entrada (opcional):
          </label>
          <textarea
            value={servicosEntrada}
            onChange={(e) => setServicosEntrada(e.target.value)}
            placeholder="Recursos, informações ou serviços necessários"
            rows={3}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Serviço de Saída (opcional):
          </label>
          <textarea
            value={servicoSaida}
            onChange={(e) => setServicoSaida(e.target.value)}
            placeholder="Resultado ou produto final"
            rows={3}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Tabela de Observações */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Observações:
        </label>
        {observacoes.map((obs, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <textarea
              value={obs[0]}
              onChange={(e) => handleObservacoesChange(index, e.target.value)}
              placeholder={`Observação ${index + 1}`}
              rows={2}
              style={{ 
                flex: 1, 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
            {observacoes.length > 1 && (
              <button
                type="button"
                onClick={() => removeObservacaoRow(index)}
                style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  height: 'fit-content'
                }}
              >
                Remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addObservacaoRow}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Adicionar Observação
        </button>
      </div>

      {/* Tabela Principal */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Tabela Principal:
        </label>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '120px' }}>Fluxo das Ações</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '200px' }}>Descrição</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '120px' }}>Responsável</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '150px' }}>Documentos Associados</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '150px' }}>Instruções de Trabalho</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', width: '80px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tabelaPrincipal.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <textarea
                        value={cell}
                        onChange={(e) => handleTabelaPrincipalChange(rowIdx, colIdx, e.target.value)}
                        style={{ 
                          width: '100%', 
                          minHeight: '40px', 
                          border: 'none', 
                          resize: 'vertical',
                          fontSize: '12px'
                        }}
                        placeholder={headers[colIdx]?.replace('\n', ' ')}
                      />
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                    {tabelaPrincipal.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTabelaPrincipalRow(rowIdx)}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
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
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Adicionar Linha
        </button>
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => navigate('/file')}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Cancelar
        </button>
        
        <button
          type="button"
          onClick={handleCreateTable}
          disabled={loading}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'A criar...' : 'Criar Tabela'}
        </button>
      </div>
    </div>
  );
}