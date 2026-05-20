import React, { useState, useContext, useEffect } from 'react';
import './novoProcedimento.css';
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
  const [indicadores, setIndicadores] = useState({
    indicadores_r1: '',
    indicadores_r2: '',
    indicadores_r3: ''
  }); // Objeto com 3 campos de indicadores
  const [users, setUsers] = useState([]); // Lista de users para o dropdown
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar o próximo número de processo quando o componente carregar
  useEffect(() => {
    const fetchNextProcessNumber = async () => {
      try {
        // Buscar a lista de donos de processos para determinar quantos processos existem
        const response = await fetch('https://api-iso-9001.onrender.com/files/process-owners');
        if (response.ok) {
          const processOwners = await response.json();
          
          // Extrair números dos processos existentes
          const processNumbers = Object.keys(processOwners)
            .filter(processName => processName.startsWith('PROCESSO '))
            .map(processName => {
              const match = processName.match(/^PROCESSO (\d+):/);
              return match ? parseInt(match[1], 10) : -1;
            })
            .filter(num => num >= 0)
            .sort((a, b) => a - b); // Ordenar para encontrar gaps
          
          console.log('Números de processos existentes:', processNumbers);
          
          // Determinar o próximo número disponível
          let nextNumber = 0;
          if (processNumbers.length === 0) {
            nextNumber = 0;
          } else {
            // Procurar o primeiro gap na sequência ou o próximo número
            for (let i = 0; i < processNumbers.length; i++) {
              if (processNumbers[i] !== i) {
                nextNumber = i;
                break;
              }
            }
            // Se não há gaps, usar o próximo número na sequência
            if (nextNumber === 0 && processNumbers[0] === 0) {
              nextNumber = processNumbers.length;
            }
          }
          
          console.log('Próximo número de processo será:', nextNumber);
          setNextProcessNumber(nextNumber);
        } else {
          // Se não conseguir buscar, assume que é o processo 0
          console.warn('Erro ao buscar processos existentes, usando número 0');
          setNextProcessNumber(0);
        }
      } catch (error) {
        console.warn('Erro ao buscar próximo número de processo:', error);
        setNextProcessNumber(0);
      }
    };

    fetchNextProcessNumber();
  }, []);

  // Buscar lista de users quando o componente carregar
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://api-iso-9001.onrender.com/users/getAllUsers');
        if (response.ok) {
          const usersData = await response.json();
          setUsers(usersData);
        } else {
          console.warn('Erro ao buscar users:', response.statusText);
        }
      } catch (error) {
        console.warn('Erro ao buscar users:', error);
      }
    };

    fetchUsers();
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
  const handleIndicadoresChange = (field, value) => {
    setIndicadores(prev => ({
      ...prev,
      [field]: value
    }));
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
      formData.append('indicadores_r1', indicadores.indicadores_r1);
      formData.append('indicadores_r2', indicadores.indicadores_r2);
      formData.append('indicadores_r3', indicadores.indicadores_r3);

      console.log('Enviando dados para o backend...');

      // 3. PRIMEIRO: Guardar o PDF
      const pdfResponse = await fetch('https://api-iso-9001.onrender.com/files/save-pdf', {
        method: 'POST',
        body: formData
      });

      if (!pdfResponse.ok) {
        throw new Error('Erro ao guardar PDF');
      }

      console.log('✅ PDF guardado com sucesso!');
      
      // 4. SEGUNDO: Criar o registro na BD
      console.log('🚀 Criando registro na BD...');
      const recordResponse = await fetch('https://api-iso-9001.onrender.com/files/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processName: fullProcessName,
          donoProcesso: donoProcesso,
          objetivoProcesso: objetivoProcesso,
          servicos_entrada: servicosEntrada,
          servico_saida: servicoSaida,
          indicadores_r1: indicadores.indicadores_r1,
          indicadores_r2: indicadores.indicadores_r2,
          indicadores_r3: indicadores.indicadores_r3,
          atividades: atividades
        })
      });
      
      if (recordResponse.ok) {
        const recordResult = await recordResponse.json();
        console.log('✅ REGISTRO CRIADO NA BD COM SUCESSO!');
        console.log('📍 Path:', recordResult.path);
        console.log('📊 Dados salvos:', recordResult.data);
      } else {
        const errorText = await recordResponse.text();
        console.error('❌ Erro ao criar registro na BD:', errorText);
        throw new Error('Erro ao criar registro na BD: ' + errorText);
      }

      console.log('🎯 PROCESSO CRIADO COMPLETAMENTE!');
      
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
    <div className="novo-procedimento-container">
      <h2>Criar Novo Processo</h2>
      {error && (
        <div className="novo-procedimento-error">
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Nome do Processo:
        </label>
        <input
          type="text"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          placeholder="Ex: Gestão de Recursos Humanos"
          className="novo-procedimento-input"
        />
        <small style={{ color: '#666' }}>
          {nextProcessNumber !== null 
            ? `Nome completo será: PROCESSO ${nextProcessNumber}: ${processName || '[Nome do Processo]'}`
            : 'Aguardando carregamento do número...'
          }
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Dono do Processo:
        </label>
        <select
          value={donoProcesso}
          onChange={(e) => setDonoProcesso(e.target.value)}
          className="novo-procedimento-input"
          style={{ backgroundColor: 'white' }}
        >
          <option value="">-</option>
          {users.map((user) => (
            <option key={user.id} value={user.nome}>
              {user.nome}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Objetivo do Processo:
        </label>
        <textarea
          value={objetivoProcesso}
          onChange={(e) => setObjetivoProcesso(e.target.value)}
          placeholder="Descreva o objetivo principal do processo"
          rows={3}
          className="novo-procedimento-textarea"
        />
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="novo-procedimento-label">
            Serviços de Entrada:
          </label>
          <textarea
            value={servicosEntrada}
            onChange={(e) => setServicosEntrada(e.target.value)}
            placeholder="Recursos, informações ou serviços necessários"
            rows={4}
            className="novo-procedimento-textarea"
          />
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="novo-procedimento-label">
            Serviço de Saída:
          </label>
          <textarea
            value={servicoSaida}
            onChange={(e) => setServicoSaida(e.target.value)}
            placeholder="Resultado ou produto final do processo"
            rows={4}
            className="novo-procedimento-textarea"
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Atividades do Processo:
        </label>
        <div className="novo-procedimento-table-wrapper">
          <table className="novo-procedimento-table">
            <thead>
              <tr>
                <th>Atividade</th>
                <th>Responsável</th>
                <th>Input</th>
                <th>Output</th>
                <th>Método</th>
                <th>Requisitos CQCQ</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx}>
                      <textarea
                        value={cell}
                        onChange={(e) => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                        className="novo-procedimento-textarea"
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    {atividades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAtividadeRow(rowIdx)}
                        className="novo-procedimento-button novo-procedimento-remove"
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
        <button
          type="button"
          onClick={addAtividadeRow}
          className="novo-procedimento-button novo-procedimento-add-row"
        >
          Adicionar Atividade
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="novo-procedimento-label">
          Indicadores:
        </label>

        <div style={{ marginBottom: '10px' }}>
          <label className="novo-procedimento-label" style={{ fontSize: '14px', color: '#666' }}>
            Indicador R1:
          </label>
          <input
            type="text"
            value={indicadores.indicadores_r1}
            onChange={(e) => handleIndicadoresChange('indicadores_r1', e.target.value)}
            placeholder="Primeiro indicador"
            className="novo-procedimento-input"
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label className="novo-procedimento-label" style={{ fontSize: '14px', color: '#666' }}>
            Indicador R2:
          </label>
          <input
            type="text"
            value={indicadores.indicadores_r2}
            onChange={(e) => handleIndicadoresChange('indicadores_r2', e.target.value)}
            placeholder="Segundo indicador"
            className="novo-procedimento-input"
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label className="novo-procedimento-label" style={{ fontSize: '14px', color: '#666' }}>
            Indicador R3:
          </label>
          <input
            type="text"
            value={indicadores.indicadores_r3}
            onChange={(e) => handleIndicadoresChange('indicadores_r3', e.target.value)}
            placeholder="Terceiro indicador"
            className="novo-procedimento-input"
          />
        </div>
      </div>

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
          onClick={handleCreateProcess}
          disabled={loading}
          className="novo-procedimento-button"
        >
          {loading ? 'A criar...' : 'Criar Processo'}
        </button>
      </div>
    </div>
  );
}
