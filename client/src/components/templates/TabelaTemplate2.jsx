import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import useRowContextMenu from "../ContextMenu/useRowContextMenu";
import "./styleTemplates.css"; 

export default function Template2({
  isEditable = false, // Nova prop para controlar editabilidade (começa não-editável)
  setIsEditable, // Nova prop para alterar estado de editabilidade
  canEdit = true, // Nova prop para controlar se pode editar (permissões)
  isSuperAdmin = false, // Nova prop para controlar se é SuperAdmin (pode mudar dono processo)
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
  // Props para manipulação de indicadores
  onMoveIndicadorUp,
  onMoveIndicadorDown,
  onInsertIndicadorAbove,
  onInsertIndicadorBelow,
  onDeleteIndicador,
  // Props adicionais para ExportPdfButton
  pathFilename = "",
  onSaveSuccess,
}) {
  // Refs para textareas auto-resize
  const textAreaRefs = useRef({});
  
  // Hook para o context menu das atividades
  const contextMenuAtividades = useRowContextMenu({
    totalRows: atividades.length,
    onMoveRowUp: onMoveAtividadeUp,
    onMoveRowDown: onMoveAtividadeDown,
    onInsertRowAbove: onInsertAtividadeAbove,
    onInsertRowBelow: onInsertAtividadeBelow,
    onDeleteRow: onDeleteAtividade
  });

  // Hook para o context menu dos indicadores (dinâmico)
  const contextMenuIndicadores = useRowContextMenu({
    totalRows: Array.isArray(indicadores) ? indicadores.length : 3, 
    onMoveRowUp: onMoveIndicadorUp,
    onMoveRowDown: onMoveIndicadorDown,
    onInsertRowAbove: onInsertIndicadorAbove,
    onInsertRowBelow: onInsertIndicadorBelow,
    onDeleteRow: onDeleteIndicador
  });

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
        ${Array.isArray(indicadores) ? 
          // Se for array, renderizar dinamicamente
          indicadores.map((indicador, idx) => `
            <tr>
              <td><strong>Indicador R${idx + 1}:</strong><br>${escapeHtml(indicador || '')}</td>
            </tr>
          `).join('') :
          // Se for objeto, renderizar os 3 campos fixos
          `<tr>
            <td><strong>Indicador R1:</strong><br>${escapeHtml(indicadores.indicadores_r1 || '')}</td>
          </tr>
          <tr>
            <td><strong>Indicador R2:</strong><br>${escapeHtml(indicadores.indicadores_r2 || '')}</td>
          </tr>
          <tr>
            <td><strong>Indicador R3:</strong><br>${escapeHtml(indicadores.indicadores_r3 || '')}</td>
          </tr>`
        }
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

  console.log("PathFileName:", pathFilename);

  return (
    <div className="template2-container">
      {/* Action buttons at top right */}
      <div className="action-buttons-container">
        {/* Botão Editar/Guardar integrado */}
        {setIsEditable && canEdit && (
          <>
            {!isEditable ? (
              <button 
                className="edit-button"
                onClick={() => setIsEditable(true)}
                title="Ativar modo de edição"
              >
                ✏️ Editar
              </button>
            ) : (
              <ExportPdfButton
                templateType={2}
                data={data}
                headers={[]}
                dataObs={[]}
                headersObs={[]}
                atividades={atividades}
                donoProcesso={donoProcesso}
                donoProcessoOriginal={donoProcessoOriginal}
                objetivoProcesso={objetivoProcesso}
                indicadores={indicadores}
                pathFilename={pathFilename}
                servicosEntrada={servicosEntrada}
                servicoSaida={servicoSaida}
                onSaveSuccess={() => {
                  onSaveSuccess && onSaveSuccess();
                  setIsEditable(false); // Desativa edição após guardar
                }}
              />
            )}
          </>
        )}
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
            disabled={!isEditable || !isSuperAdmin}
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
          readOnly={!isEditable}
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
          readOnly={!isEditable}
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
          readOnly={!isEditable}
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
    </tr>
  </thead>
  <tbody>
    {atividades.map((row, rowIdx) => (
      <tr 
        key={rowIdx}
        onContextMenu={(e) => contextMenuAtividades.handleContextMenuEvent(e, rowIdx)}
      >
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
                readOnly={!isEditable}
              />
            </td>
          );
        })}
      </tr>
    ))}
  </tbody>
</table>

{/* Renderizar os context menus fora das tabelas */}
{contextMenuAtividades.contextMenu}
{contextMenuIndicadores.contextMenu}

{/* Tabela Indicadores de monitorização do processo */}
<table className="tabela-indicadores">
  <thead>
    <tr>
      <th className="header-center">Indicadores de monitorização do processo</th>
    </tr>
  </thead>
  <tbody>
    {/* Suporte para indicadores como array ou objeto */}
    {Array.isArray(indicadores) ? (
      // Se for array, renderizar dinamicamente
      indicadores.map((indicador, rowIdx) => (
        <tr key={rowIdx} onContextMenu={(e) => contextMenuIndicadores.handleContextMenuEvent(e, rowIdx)}>
          <td>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              Indicador R{rowIdx + 1}:
            </label>
            <textarea
              ref={(el) => textAreaRefs.current[`indicador-${rowIdx}`] = el}
              className="tabela-indicadores-textarea medium"
              value={indicador || ''}
              onChange={e => handleIndicadoresChange(rowIdx, e.target.value)}
              onInput={handleTextareaResize}
              placeholder={`Indicador ${rowIdx + 1} de monitorização...`}
              style={{ resize: 'none' }}
              readOnly={!isEditable}
            />
          </td>
        </tr>
      ))
    ) : (
      // Se for objeto, renderizar os 3 campos fixos
      <>
        <tr onContextMenu={(e) => contextMenuIndicadores.handleContextMenuEvent(e, 0)}>
          <td>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              Indicador R1:
            </label>
            <textarea
              ref={(el) => textAreaRefs.current['indicador-r1'] = el}
              className="tabela-indicadores-textarea medium"
              value={indicadores.indicadores_r1 || ''}
              onChange={e => handleIndicadoresChange('indicadores_r1', e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Primeiro indicador de monitorização..."
              style={{ resize: 'none' }}
              readOnly={!isEditable}
            />
          </td>
        </tr>
        <tr onContextMenu={(e) => contextMenuIndicadores.handleContextMenuEvent(e, 1)}>
          <td>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              Indicador R2:
            </label>
            <textarea
              ref={(el) => textAreaRefs.current['indicador-r2'] = el}
              className="tabela-indicadores-textarea medium"
              value={indicadores.indicadores_r2 || ''}
              onChange={e => handleIndicadoresChange('indicadores_r2', e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Segundo indicador de monitorização..."
              style={{ resize: 'none' }}
              readOnly={!isEditable}
            />
          </td>
        </tr>
        <tr onContextMenu={(e) => contextMenuIndicadores.handleContextMenuEvent(e, 2)}>
          <td>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              Indicador R3:
            </label>
            <textarea
              ref={(el) => textAreaRefs.current['indicador-r3'] = el}
              className="tabela-indicadores-textarea medium"
              value={indicadores.indicadores_r3 || ''}
              onChange={e => handleIndicadoresChange('indicadores_r3', e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Terceiro indicador de monitorização..."
              style={{ resize: 'none' }}
              readOnly={!isEditable}
            />
          </td>
        </tr>
      </>
    )}
  </tbody>
</table>
    </div>
  );
}