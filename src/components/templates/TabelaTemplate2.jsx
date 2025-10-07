import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import useRowContextMenu from "../ContextMenu/useRowContextMenu";
import MultiSelectDonos from "../MultiSelectDonos";
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
  history = [], // Novo parâmetro para histórico
  clearHistory // Nova prop para função de limpar histórico
}) {
  // Log do histórico para debug
  console.log('Histórico:', history);
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

    const Title = pathFilename ? pathFilename.split('/') : [''];


  console.log("PathFileName:", pathFilename);

  return (
    <div className="template2-container">
       <h2 style={{textAlign: 'left', margin: 0, paddingLeft: 0, width: '100%'}}>
                {Title.map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < Title.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h2>
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
                history={history}
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
          pathFilename={pathFilename}
          history={history}
        />
        
        {/* Botão de debug para limpar histórico - só aparece quando está a editar */}
        {isEditable && clearHistory && (
          <button 
            className="clear-history-button"
            onClick={clearHistory}
            title="Limpar histórico (Debug)"
            style={{
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '10px'
            }}
          >
            🗑️ Limpar Histórico
          </button>
        )}
      </div>
      
      {/* Tabela principal */}
<table className="tabela-processo">
  <thead>
    <tr>
      <th colSpan={2} className="header-left">DONO DO PROCESSO<br/>(nomeado):</th>
      <td colSpan={4} className="cell-left">
        <MultiSelectDonos
          funcionarios={funcionarios}
          donoProcesso={donoProcesso}
          setDonoProcesso={setDonoProcesso}
          isEditable={isEditable}
          isSuperAdmin={isSuperAdmin}
          donoProcessoAlterado={donoProcessoAlterado}
        />
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

      {/* DEBUG: Mostrar tabela de histórico visível na interface */}
      {history && history.length > 0 && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          border: '2px solid #28a745', 
          borderRadius: '8px',
          backgroundColor: '#d4edda',
          display: 'none' // Mudar para 'block' para ver o histórico na interface
        }}>
          <h3 style={{ color: '#155724', marginBottom: '15px' }}>
            🔍 DEBUG Template2 - Histórico de Alterações ({history.length} entradas)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Data</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Utilizador</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ação</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px' }}>
                      {entry.data || 'N/A'}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px' }}>
                      {entry.utilizador || 'N/A'}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px' }}>
                      {entry.acao || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '6px', 
                      border: '1px solid #ddd', 
                      fontSize: '11px',
                      maxWidth: '300px',
                      wordWrap: 'break-word'
                    }}>
                      {entry.descricao || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Se não há histórico, mostrar aviso de debug */}
      {(!history || history.length === 0) && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          border: '2px solid #dc3545', 
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <h3>⚠️ DEBUG Template2 - Nenhum histórico encontrado</h3>
          <p>History prop: {JSON.stringify(history)}</p>
        </div>
      )}
    </div>
  );
}