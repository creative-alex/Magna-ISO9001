import React, { useRef, useEffect } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import "./styleTemplates.css"; 

export default function Template2({
  data = [[ "", "" ]],
  handleChange,
  handleAtividadesChange,
  handleIndicadoresChange,
  donoProcesso = "",
  setDonoProcesso,
  donoProcessoOriginal = "",
  objetivoProcesso = "",
  setObjetivoProcesso,
  atividades = [["", "", "", "", "", ""], 
                ["", "", "", "", "", ""], 
                ["", "", "", "", "", ""], 
                ["", "", "", "", "", ""]],
  indicadores = [ "" ],
  servicosEntrada = "",
  setServicosEntrada,
  servicoSaida = "",
  setServicoSaida,
  funcionarios = [], 
  getTablesHtml,
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
}) {
  // Refs para textareas auto-resize
  const textAreaRefs = useRef({});

  // Verifica se o dono do processo foi alterado
  const donoProcessoAlterado = donoProcesso !== donoProcessoOriginal;

  // Função para gerar HTML das tabelas para PDF
  const generateTablesHtml = () => {
    // Escapa caracteres especiais no HTML
    const escapeHtml = (text) => {
      if (!text || typeof text !== 'string') return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    };

    const mainTableHtml = `
      <style>
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-family: Arial, sans-serif;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .center { text-align: center; }
        .left { text-align: left; }
        h3 {
          font-family: Arial, sans-serif;
          font-size: 14px;
          margin: 15px 0 10px 0;
        }
      </style>
      
      <h3>PROCESSO</h3>
      <table>
        <tr>
          <th colspan="2" style="width: 30%;">DONO DO PROCESSO (nomeado):</th>
          <td colspan="4">${escapeHtml(donoProcesso)}</td>
        </tr>
        <tr>
          <th colspan="2">OBJETIVO DO PROCESSO:</th>
          <td colspan="4">${escapeHtml(objetivoProcesso)}</td>
        </tr>
        <tr>
          <th colspan="3" class="center">SERVIÇOS DE ENTRADAS</th>
          <th colspan="3" class="center">SERVIÇO DE SAÍDA</th>
        </tr>
        <tr>
          <td colspan="3" style="height: 80px;">${escapeHtml(servicosEntrada)}</td>
          <td colspan="3" style="height: 80px;">${escapeHtml(servicoSaida)}</td>
        </tr>
      </table>

      <h3>PRINCIPAIS ATIVIDADES</h3>
      <table>
        <tr>
          <th style="width: 20%;">Principais Atividades</th>
          <th style="width: 15%;">Procedimentos Associados</th>
          <th style="width: 15%;">Requisitos ISO 9001</th>
          <th style="width: 15%;">Requisitos DGERT</th>
          <th style="width: 15%;">Requisitos EQAVET</th>
          <th style="width: 20%;">Requisitos CQCQ</th>
        </tr>
        ${(atividades || []).map(row => `
          <tr>
            ${(row || []).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
          </tr>
        `).join('')}
      </table>
    `;

    const obsTableHtml = `
      <h3>INDICADORES DE MONITORIZAÇÃO</h3>
      <table>
        <tr>
          <th class="center">Indicadores de monitorização do processo</th>
        </tr>
        ${(indicadores || []).map(indicador => `
          <tr>
            <td>${escapeHtml(indicador)}</td>
          </tr>
        `).join('')}
      </table>
    `;

    return { mainTableHtml, obsTableHtml };
  };

  // Função para redimensionar textarea automaticamente
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
  };

  // Redimensiona textareas quando dados mudam
  useEffect(() => {
    Object.values(textAreaRefs.current).forEach(textarea => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
      }
    });
  }, [atividades, servicosEntrada, servicoSaida, objetivoProcesso, indicadores]);

  return (
    <div className="template2-container">
    {/* Tabela principal */}
<table className="tabela-processo">
  <thead>
    <tr>
      <th colSpan={2} className="header-left">DONO DO PROCESSO<br/>(nomeado):</th>
      <td colSpan={4} className="cell-left">
        <div className="select-container">
          <select
            className={`tabela-processo-select ${donoProcessoAlterado ? 'altered' : ''}`}
            value={donoProcesso}
            onChange={e => setDonoProcesso(e.target.value)}
          >
            <option value="">Selecione um funcionário...</option>
            {funcionarios.map((funcionario) => (
              <option key={funcionario.id} value={funcionario.nome}>
                {funcionario.nome}
              </option>
            ))}
          </select>
          {donoProcessoAlterado && (
            <div className="alteration-badge">
              Alterado
            </div>
          )}
        </div>
      </td>
    </tr>
    <tr>
      <th colSpan={2} className="header-left">OBJETIVO DO PROCESSO:</th>
      <td colSpan={4} className="cell-left">
        <textarea
          ref={(el) => textAreaRefs.current['objetivo-processo'] = el}
          className="tabela-processo-textarea"
          value={objetivoProcesso}
          onChange={e => setObjetivoProcesso(e.target.value)}
          onInput={handleTextareaResize}
          placeholder="Descreva o objetivo principal do processo..."
          style={{ resize: 'none' }}
        />
      </td>
    </tr>
    <tr>
      <th colSpan={3} className="header-center">SERVIÇOS DE ENTRADAS</th>
      <th colSpan={3} className="header-center">SERVIÇO DE SAÍDA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colSpan={3} className="cell-top">
        <textarea
          ref={(el) => textAreaRefs.current['servicos-entrada'] = el}
          className="tabela-processo-textarea large"
          value={servicosEntrada}
          onChange={e => setServicosEntrada(e.target.value)}
          onInput={handleTextareaResize}
          placeholder="Descreva os serviços de entrada necessários..."
          style={{ resize: 'none' }}
        />
      </td>
      <td colSpan={3} className="cell-top">
        <textarea
          ref={(el) => textAreaRefs.current['servico-saida'] = el}
          className="tabela-processo-textarea large"
          value={servicoSaida}
          onChange={e => setServicoSaida(e.target.value)}
          onInput={handleTextareaResize}
          placeholder="Descreva o serviço de saída resultante..."
          style={{ resize: 'none' }}
        />
      </td>
    </tr>
  </tbody>
</table>

{/* Tabela Principais Atividades */}
<table className="tabela-atividades">
  <thead>
    <tr>
      <th>Principais Atividades</th>
      <th>Procedimentos Associados</th>
      <th>Requisitos ISO 9001</th>
      <th>Requisitos DGERT</th>
      <th>Requisitos EQAVET</th>
      <th>Requisitos CQCQ</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {atividades.map((row, rowIdx) => (
      <tr key={rowIdx}>
        {row.map((cell, colIdx) => {
          const labels = [
            'Principais Atividades',
            'Procedimentos Associados', 
            'Requisitos ISO 9001',
            'Requisitos DGERT',
            'Requisitos EQAVET',
            'Requisitos CQCQ'
          ];
          return (
            <td key={colIdx} data-label={labels[colIdx]}>
              <textarea
                ref={(el) => textAreaRefs.current[`atividade-${rowIdx}-${colIdx}`] = el}
                className="tabela-atividades-input custom"
                value={cell}
                onChange={e => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                onInput={handleTextareaResize}
                placeholder={`${colIdx === 0 ? 'Atividade' : colIdx === 1 ? 'Procedimento' : 'Requisito'}...`}
                style={{ resize: 'none' }}
              />
            </td>
          );
        })}
        <td className="actions-cell">
          <div className="actions-container">
            <button 
              className={`action-btn move up ${rowIdx === 0 ? 'disabled' : ''}`}
              onClick={() => onMoveAtividadeUp && onMoveAtividadeUp(rowIdx)}
              disabled={rowIdx === 0}
              title="Mover para cima"
            >
              ↑
            </button>
            
            <button 
              className={`action-btn move down ${rowIdx === atividades.length - 1 ? 'disabled' : ''}`}
              onClick={() => onMoveAtividadeDown && onMoveAtividadeDown(rowIdx)}
              disabled={rowIdx === atividades.length - 1}
              title="Mover para baixo"
            >
              ↓
            </button>
            
            <button 
              className="action-btn insert"
              onClick={() => onInsertAtividadeAbove && onInsertAtividadeAbove(rowIdx)}
              title="Inserir linha acima"
            >
              +
            </button>
            
            <button 
              className="action-btn insert"
              onClick={() => onInsertAtividadeBelow && onInsertAtividadeBelow(rowIdx)}
              title="Inserir linha abaixo"
            >
              +
            </button>
            
            {atividades.length > 1 && (
              <button 
                className="action-btn delete"
                onClick={() => onDeleteAtividade && onDeleteAtividade(rowIdx)}
                title="Deletar linha"
              >
                ×
              </button>
            )}
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>

{/* Tabela Indicadores de monitorização do processo */}
<table className="tabela-indicadores">
  <thead>
    <tr>
      <th className="header-center">Indicadores de monitorização do processo</th>
    </tr>
  </thead>
  <tbody>
    {(indicadores || []).map((indicador, rowIdx) => (
      <tr key={rowIdx}>
        <td>
          <textarea
            ref={(el) => textAreaRefs.current[`indicador-${rowIdx}`] = el}
            className="tabela-indicadores-textarea medium"
            value={indicador}
            onChange={e => handleIndicadoresChange(rowIdx, e.target.value)}
            onInput={handleTextareaResize}
            placeholder="Descreva o indicador de monitorização..."
            style={{ resize: 'none' }}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>

      <PreviewPdfButton 
        templateType={2}
        atividades={atividades}
        donoProcesso={donoProcesso}
        objetivoProcesso={objetivoProcesso}
        indicadores={indicadores}
        servicosEntrada={servicosEntrada}
        servicoSaida={servicoSaida}
      />
    </div>
  );
}