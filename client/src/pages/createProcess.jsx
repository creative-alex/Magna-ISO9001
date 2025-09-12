import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/userContext';
import { generateEditablePdfTemplate2 } from '../utils/pdfGenerate';

export default function CreateProcess() {
  const navigate = useNavigate();
  const { username } = useContext(UserContext);
  
  // Estados para os dados do processo
  const [processName, setProcessName] = useState('');
  const [processFolder, setProcessFolder] = useState('');
  const [nextProcessNumber, setNextProcessNumber] = useState(null);
  const [donoProcesso, setDonoProcesso] = useState('');
  const [objetivoProcesso, setObjetivoProcesso] = useState('');
  const [servicosEntrada, setServicosEntrada] = useState('');
  const [servicoSaida, setServicoSaida] = useState('');
  const [atividades, setAtividades] = useState([
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', '']
  ]);
  const [indicadores, setIndicadores] = useState(['', '']); // Começar com 2 campos vazios
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar o próximo número de processo quando o componente carregar
  useEffect(() => {
    const fetchNextProcessNumber = async () => {
      try {
        // Buscar a lista de donos de processos para determinar quantos processos existem
        const response = await fetch('http://192.168.1.219:8080/files/process-owners');
        if (response.ok) {
          const processOwners = await response.json();
          
          // Extrair números dos processos existentes
          const processNumbers = Object.keys(processOwners)
            .filter(processName => processName.startsWith('PROCESSO '))
            .map(processName => {
              const match = processName.match(/^PROCESSO (\d+):/);
              return match ? parseInt(match[1], 10) : -1;
            })
            .filter(num => num >= 0);
          
          // Determinar o próximo número
          const nextNumber = processNumbers.length > 0 
            ? Math.max(...processNumbers) + 1 
            : 0;
          
          setNextProcessNumber(nextNumber);
        } else {
          // Se não conseguir buscar, assume que é o processo 0
          setNextProcessNumber(0);
        }
      } catch (error) {
        console.warn('Erro ao buscar próximo número de processo:', error);
        setNextProcessNumber(0);
      }
    };

    fetchNextProcessNumber();
  }, []);

  // Função para atualizar atividades
  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    setAtividades(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
  };

  // Função para atualizar indicadores
  const handleIndicadoresChange = (rowIdx, value) => {
    setIndicadores(prev => {
      const novo = [...prev];
      novo[rowIdx] = value;
      return novo;
    });
  };

  // Função para adicionar nova linha de indicadores
  const addIndicadorRow = () => {
    setIndicadores(prev => [...prev, '']);
  };

  // Função para remover linha de indicadores
  const removeIndicadorRow = (index) => {
    if (indicadores.length > 1) {
      setIndicadores(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para adicionar nova linha de atividades
  const addAtividadeRow = () => {
    setAtividades(prev => [...prev, ['', '', '', '', '', '']]);
  };

  // Função para remover linha de atividades
  const removeAtividadeRow = (index) => {
    if (atividades.length > 1) {
      setAtividades(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para criar o processo
  const handleCreateProcess = async () => {
    // Validações
    if (!processName.trim()) {
      setError('Nome do processo é obrigatório');
      return;
    }

    if (!donoProcesso.trim()) {
      setError('Dono do processo é obrigatório');
      return;
    }

    if (nextProcessNumber === null) {
      setError('Aguarde o carregamento do número do processo...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Criar o nome completo do processo com numeração
      const fullProcessName = `PROCESSO ${nextProcessNumber}: ${processName.trim()}`;
      
      // 2. Criar o PDF com Template 2
      console.log('Gerando PDF Template 2...');
      const pdfBytes = await generateEditablePdfTemplate2({
        atividades,
        donoProcesso,
        objetivoProcesso,
        indicadores,
        servicosEntrada,
        servicoSaida
      });

      // 3. Preparar dados para envio
      const formData = new FormData();
      
      // Nome do ficheiro (Template 2 usa numeração com 1 dígito)
      const fileName = `1-${fullProcessName}.pdf`;
      const folderPath = fullProcessName; // Usar o nome completo como pasta
      
      // Criar blob do PDF
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('file', pdfBlob, fileName);
      formData.append('filename', fileName);
      formData.append('folders', JSON.stringify([folderPath]));
      
      // Dados específicos do Template 2
      formData.append('atividades', JSON.stringify(atividades));
      formData.append('donoProcesso', donoProcesso);
      formData.append('objetivoProcesso', objetivoProcesso);
      formData.append('servicos_entrada', servicosEntrada);
      formData.append('servico_saida', servicoSaida);
      formData.append('indicadores', JSON.stringify(indicadores));

      console.log('Enviando dados para o backend...');

      // 3. Enviar para o backend
      const response = await fetch('http://192.168.1.219:8080/files/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao criar processo');
      }

      console.log('Processo criado com sucesso!');
      
      // 4. Atualizar dono do processo no Firestore
      try {
        await fetch('http://192.168.1.219:8080/files/update-dono-processo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            processId: fullProcessName,
            donoProcesso: donoProcesso
          })
        });
      } catch (error) {
        console.warn('Erro ao atualizar dono do processo:', error);
      }

      // 5. Redirecionar para a lista de PDFs
      navigate('/file');
      
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      setError('Erro ao criar processo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Criar Novo Processo</h2>
      
      
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
          Nome do Processo:
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
          {nextProcessNumber !== null 
            ? `Nome completo será: PROCESSO ${nextProcessNumber}: ${processName || '[Nome do Processo]'}`
            : 'Aguardando carregamento do número...'
          }
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Dono do Processo:
        </label>
        <input
          type="text"
          value={donoProcesso}
          onChange={(e) => setDonoProcesso(e.target.value)}
          placeholder="Nome do responsável pelo processo"
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Objetivo do Processo:
        </label>
        <textarea
          value={objetivoProcesso}
          onChange={(e) => setObjetivoProcesso(e.target.value)}
          placeholder="Descreva o objetivo principal do processo"
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

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Serviços de Entrada:
          </label>
          <textarea
            value={servicosEntrada}
            onChange={(e) => setServicosEntrada(e.target.value)}
            placeholder="Recursos, informações ou serviços necessários"
            rows={4}
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
            Serviço de Saída:
          </label>
          <textarea
            value={servicoSaida}
            onChange={(e) => setServicoSaida(e.target.value)}
            placeholder="Resultado ou produto final do processo"
            rows={4}
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Atividades do Processo:
        </label>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Atividade</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Responsável</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Input</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Output</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Método</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Requisitos CQCQ</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', width: '80px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} style={{ border: '1px solid #ccc', padding: '4px' }}>
                      <textarea
                        value={cell}
                        onChange={(e) => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                        style={{ 
                          width: '100%', 
                          minHeight: '40px', 
                          border: 'none', 
                          resize: 'vertical',
                          fontSize: '12px'
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                    {atividades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAtividadeRow(rowIdx)}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        X
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={addAtividadeRow}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Adicionar Atividade
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Indicadores:
        </label>
        {indicadores.map((indicador, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={indicador}
              onChange={(e) => handleIndicadoresChange(index, e.target.value)}
              placeholder={`Indicador ${index + 1}`}
              style={{ 
                flex: 1, 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            {indicadores.length > 1 && (
              <button
                type="button"
                onClick={() => removeIndicadorRow(index)}
                style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addIndicadorRow}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Adicionar Indicador
        </button>
      </div>

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
          onClick={handleCreateProcess}
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
          {loading ? 'A criar...' : 'Criar Processo'}
        </button>
      </div>
    </div>
  );
}
