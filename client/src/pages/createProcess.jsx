import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/userContext';
import { generateEditablePdfTemplate2 } from '../utils/pdfGenerate';

export default function CreateProcess() {
  const navigate = useNavigate();
  const { username } = useContext(UserContext);
  
  // Estados para os dados do processo
  const [processName, setProcessName] = useState('');
  const [processFolder, setProcessFolder] = useState('');
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
  const [indicadores, setIndicadores] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Função para criar o processo
  const handleCreateProcess = async () => {
    // Validações
    if (!processName.trim()) {
      setError('Nome do processo é obrigatório');
      return;
    }

    if (!processFolder.trim()) {
      setError('Nome da pasta é obrigatório');
      return;
    }

    if (!donoProcesso.trim()) {
      setError('Dono do processo é obrigatório');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Criar o PDF com Template 2
      console.log('Gerando PDF Template 2...');
      const pdfBytes = await generateEditablePdfTemplate2({
        atividades,
        donoProcesso,
        objetivoProcesso,
        indicadores,
        servicosEntrada,
        servicoSaida
      });

      // 2. Preparar dados para envio
      const formData = new FormData();
      
      // Nome do ficheiro (Template 2 usa numeração com 1 dígito)
      const fileName = `1-${processName.trim()}.pdf`;
      const folderPath = processFolder.trim();
      
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
      const response = await fetch('http://localhost:8080/files/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao criar processo');
      }

      console.log('Processo criado com sucesso!');
      
      // 4. Atualizar dono do processo no Firestore
      try {
        await fetch('http://localhost:8080/files/update-dono-processo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            processId: folderPath,
            donoProcesso: donoProcesso
          })
        });
      } catch (error) {
        console.warn('Erro ao atualizar dono do processo:', error);
      }

      // 5. Redirecionar para a lista de PDFs
      navigate('/superadmin');
      
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      setError('Erro ao criar processo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Criar Novo Processo (Template 2)</h2>
      
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
          value={processFolder}
          onChange={(e) => setProcessFolder(e.target.value)}
          placeholder="Ex: RH, Vendas, Produção..."
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <small style={{ color: '#666' }}>
          Esta será a pasta principal onde o processo será guardado
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Nome da Matriz:
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
          Nome do ficheiro será: 1-{processName}.pdf
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
                </tr>
              ))}
            </tbody>
          </table>
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
          onClick={() => navigate('/superadmin')}
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
          {loading ? 'Criando...' : 'Criar Processo'}
        </button>
      </div>
    </div>
  );
}
