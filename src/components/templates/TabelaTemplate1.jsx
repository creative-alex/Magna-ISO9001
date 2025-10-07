import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import DocumentosAssociados from "../DocumentosAssociados";
import InstrucoesTrabalho from "../InstrucoesTrabalho";
import useRowContextMenu from "../ContextMenu/useRowContextMenu";
import "./styleTemplates.css";

export default function Template1({ 
  isEditable = false, // Nova prop para controlar editabilidade (começa não-editável)
  setIsEditable, // Nova prop para alterar estado de editabilidade
  canEdit = true, // Nova prop para controlar se pode editar (permissões)
  data = [["", "", "", "", ""]],
  dataObs = [[""]],
  handleChange, 
  handleChangeObs, 
  templateType = 1,
  servicosEntrada = "",
  servicoSaida = "",
  setServicosEntrada,
  setServicoSaida,
  originalFilename, 
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  pathFilename,
  fieldNames,
  onSaveSuccess,
  getTablesHtml,
  obsTableRef,
  mainTableRef,
  onMoveRowUp,
  onMoveRowDown,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onAddRowObs,
  onDeleteRowObs,
  history = [],
  clearHistory
}) {
  const textAreaRefs = useRef({});
  
  const contextMenu = useRowContextMenu({
    totalRows: data.length,
    onMoveRowUp,
    onMoveRowDown,
    onInsertRowAbove,
    onInsertRowBelow,
    onDeleteRow
  });

  // Função para redimensionar textarea automaticamente
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 50)}px`;
  };

  // Redimensiona todos os textareas quando os dados mudam
  useEffect(() => {
    Object.values(textAreaRefs.current).forEach(textarea => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(textarea.scrollHeight, 50)}px`;
      }
    });
  }, [data, dataObs]);

  {/*Faz o originalNameFile dar quebra de linha ao título*/}
  const Title = originalFilename ? originalFilename.split('/') : [''];

  // Função específica para Template 1 para obter HTML das tabelas
  const getTemplate1TablesHtml = () => {
    let mainTableHtml = "";
    let obsTableHtml = "";

    if (mainTableRef && mainTableRef.current) {
      // Clone da tabela principal
      const mainTableClone = mainTableRef.current.cloneNode(true);
      
      // Substitui o conteúdo das células dos componentes especiais pelos valores reais
      const bodyRows = mainTableClone.querySelectorAll('tbody tr');
      bodyRows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, colIdx) => {
          // Coluna 3 - Documentos Associados
          if (colIdx === 3) {
            const value = data[rowIdx] ? data[rowIdx][colIdx] : '';
            console.log(`🔍 DEBUG Template1 - Linha ${rowIdx}, Coluna ${colIdx} (Documentos):`, value);
            cell.innerHTML = value.split('\n').join('<br>');
          }
          // Coluna 4 - Instruções de trabalho
          else if (colIdx === 4) {
            const value = data[rowIdx] ? data[rowIdx][colIdx] : '';
            console.log(`🔍 DEBUG Template1 - Linha ${rowIdx}, Coluna ${colIdx} (Instruções):`, value);
            cell.innerHTML = value.split('\n').join('<br>');
          }
        });
      });
      
      mainTableHtml = mainTableClone.outerHTML;
    }

    if (obsTableRef && obsTableRef.current) {
      obsTableHtml = obsTableRef.current.outerHTML;
    }

    console.log("🔍 DEBUG Template1 - HTML gerado:");
    console.log("  Main Table HTML (primeiros 200 chars):", mainTableHtml.substring(0, 200));
    console.log("  Obs Table HTML (primeiros 200 chars):", obsTableHtml.substring(0, 200));
    console.log("  Histórico NÃO incluído no HTML - será passado diretamente");

    return { 
      mainTableHtml, 
      obsTableHtml 
    };
  };

  console.log("PathFileName:", pathFilename);

  return (
    <div className="template1-container" style={{alignItems: 'flex-start'}}>
      <div className="template1-header" style={{textAlign: 'left', margin: 0, padding: 0, width: '100%', alignSelf: 'flex-start'}}>
        <h2 style={{textAlign: 'left', margin: 0, paddingLeft: 0, width: '100%'}}>
          {Title.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < Title.length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
      </div>
      {/* Action buttons at top right */}
      <div className="action-buttons-container">
        {/* Botão Editar/Guardar integrado - só aparece se canEdit for true */}
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
                templateType={templateType}
                data={data}
                headers={['Fluxo\ndas Ações', 'Descrição', 'Responsável', 'Documentos\nAssociados', 'Instruções\nde Trabalho']}
                dataObs={dataObs}
                headersObs={['Observações']}
                atividades={atividades}
                donoProcesso={donoProcesso}
                objetivoProcesso={objetivoProcesso}
                indicadores={indicadores}
                pathFilename={pathFilename}
                servicosEntrada={servicosEntrada}
                servicoSaida={servicoSaida}
                fieldNames={fieldNames}
                history={history}
                onSaveSuccess={() => {
                  onSaveSuccess && onSaveSuccess();
                  setIsEditable(false); // Desativa edição após guardar
                }}
              />
            )}
          </>
        )}
        <PreviewPdfButton 
          getTablesHtml={getTemplate1TablesHtml} 
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
    
      {/* Tabela de Observações */}
      <div ref={obsTableRef} className="primeira-tabela">
        <table className="editable-table tabela-observacoes" border="1" cellPadding={4}>
          <thead>
            <tr>
              <th className="editable-table-header">Seções do Documento</th>
            </tr>
          </thead>
          <tbody>
            {/* Objetivos */}
            <tr className="editable-table-row">
              <th className="section-header">1. Objetivos:</th>
            </tr>
            <tr className="editable-table-row">
              <td className="editable-table-cell">
                <textarea
                  ref={el => textAreaRefs.current[`obj-0-0`] = el}
                  className="editable-table-textarea tabela-observacoes-textarea"
                  value={dataObs[0] ? dataObs[0][0] : ''}
                  onChange={isEditable ? e => handleChangeObs(0, 0, e.target.value) : undefined}
                  onInput={isEditable ? handleTextareaResize : undefined}
                  placeholder={isEditable ? "Digite os objetivos do documento..." : ""}
                  readOnly={!isEditable}
                  style={{
                    backgroundColor: isEditable ? 'white' : '#f5f5f5',
                    cursor: isEditable ? 'text' : 'default',
                    border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                  }}
                />
              </td>
            </tr>
            
            {/* Campo de Aplicação */}
            <tr className="editable-table-row">
              <th className="section-header">2. Campo de Aplicação:</th>
            </tr>
            <tr className="editable-table-row">
              <td className="editable-table-cell">
                <textarea
                  ref={el => textAreaRefs.current[`campo-1-0`] = el}
                  className="editable-table-textarea tabela-observacoes-textarea"
                  value={dataObs[1] ? dataObs[1][0] : ''}
                  onChange={isEditable ? e => handleChangeObs(1, 0, e.target.value) : undefined}
                  onInput={isEditable ? handleTextareaResize : undefined}
                  placeholder={isEditable ? "Digite o campo de aplicação..." : ""}
                  readOnly={!isEditable}
                  style={{
                    backgroundColor: isEditable ? 'white' : '#f5f5f5',
                    cursor: isEditable ? 'text' : 'default',
                    border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                  }}
                />
              </td>
            </tr>

            {/* Definições */}
            <tr className="editable-table-row">
              <th className="section-header">3. Definições:</th>
            </tr>
            <tr className="editable-table-row">
              <td className="editable-table-cell">
                <textarea
                  ref={el => textAreaRefs.current[`def-2-0`] = el}
                  className="editable-table-textarea tabela-observacoes-textarea"
                  value={dataObs[2] ? dataObs[2][0] : ''}
                  onChange={isEditable ? e => handleChangeObs(2, 0, e.target.value) : undefined} 
                  onInput={isEditable ? handleTextareaResize : undefined}
                  placeholder={isEditable ? "Digite as definições relevantes..." : ""}
                  readOnly={!isEditable}
                  style={{
                    backgroundColor: isEditable ? 'white' : '#f5f5f5',
                    cursor: isEditable ? 'text' : 'default',
                    border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                  }}
                />
              </td>
            </tr>

            {/* Abreviaturas */}
            <tr className="editable-table-row">
              <th className="section-header">4. Abreviaturas:</th>
            </tr>
            <tr className="editable-table-row">
              <td className="editable-table-cell">
                <textarea
                  ref={el => textAreaRefs.current[`abrev-3-0`] = el}
                  className="editable-table-textarea tabela-observacoes-textarea"
                  value={dataObs[3] ? dataObs[3][0] : ''}
                  onChange={isEditable ? e => handleChangeObs(3, 0, e.target.value) : undefined}
                  onInput={isEditable ? handleTextareaResize : undefined}
                  placeholder={isEditable ? "Digite as abreviaturas utilizadas..." : ""}
                  readOnly={!isEditable}
                  style={{
                    backgroundColor: isEditable ? 'white' : '#f5f5f5',
                    cursor: isEditable ? 'text' : 'default',
                    border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                  }}
                />
              </td>
            </tr>

            {/* Observações */}
            <tr className="editable-table-row">
              <th className="section-header">5. Observações:</th>
            </tr>
            <tr className="editable-table-row">
              <td className="editable-table-cell">
                <textarea
                  ref={el => textAreaRefs.current[`obs-4-0`] = el}
                  className="editable-table-textarea tabela-observacoes-textarea"
                  value={dataObs[4] ? dataObs[4][0] : ''}
                  onChange={isEditable ? e => handleChangeObs(4, 0, e.target.value) : undefined}
                  onInput={isEditable ? handleTextareaResize : undefined}
                  placeholder={isEditable ? "Digite observações adicionais..." : ""}
                  readOnly={!isEditable}
                  style={{
                    backgroundColor: isEditable ? 'white' : '#f5f5f5',
                    cursor: isEditable ? 'text' : 'default',
                    border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabela Principal */}
      <div ref={mainTableRef} className="segunda-tabela">
        <table className="editable-table tabela-principal" border="1" cellPadding={4}>
          <thead>
            <tr>
              <th className="editable-table-header col-fluxo">Fluxo<br />das Ações</th>
              <th className="editable-table-header col-descricao">Descrição</th>
              <th className="editable-table-header col-responsavel">Responsável</th>
              <th className="editable-table-header col-documentos">Documentos<br/>Associados</th>
              <th className="editable-table-header col-instrucoes">Instruções<br/>de Trabalho</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className="editable-table-row"
                onContextMenu={isEditable ? (e) => contextMenu.handleContextMenuEvent(e, rowIdx) : undefined}
              >
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="editable-table-cell">
                    {colIdx === 3 ? (
                      // Coluna de Documentos Associados - usa componente especial
                      <DocumentosAssociados
                        currentValue={cell}
                        onChange={isEditable ? (value) => handleChange(rowIdx, colIdx, value) : undefined}
                        originalFilename={originalFilename}
                        isEditable={isEditable}
                        canEdit={canEdit}
                      />
                    ) : colIdx === 4 ? (
                      // Coluna de Instruções de trabalho procedimento - usa componente especial
                      <InstrucoesTrabalho
                        currentValue={cell}
                        onChange={isEditable ? (value) => handleChange(rowIdx, colIdx, value) : undefined}
                        originalFilename={originalFilename}
                        isEditable={isEditable}
                        canEdit={canEdit}
                      />
                    ) : (
                      // Outras colunas - usa textarea normal
                      <textarea
                        ref={el => textAreaRefs.current[`main-${rowIdx}-${colIdx}`] = el}
                        className="editable-table-textarea tabela-principal-textarea"                      
                        value={cell}
                        onChange={isEditable ? e => handleChange(rowIdx, colIdx, e.target.value) : undefined}
                        onInput={isEditable ? handleTextareaResize : undefined}
                        readOnly={!isEditable}
                        placeholder={isEditable ? (
                          colIdx === 0 ? 'Fluxo' :
                          colIdx === 1 ? 'Descrição' :
                          colIdx === 2 ? 'Responsável' :
                          colIdx === 3 ? 'Documentos' :
                          'Instruções'
                        ) : ""}
                        style={{
                          backgroundColor: isEditable ? 'white' : '#f5f5f5',
                          cursor: isEditable ? 'text' : 'default',
                          border: isEditable ? '1px solid #ddd' : '1px solid #e0e0e0'
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '-15px', marginBottom: '15px' }}>
        Clique com o botão direito para adicionar, mover ou remover uma linha.
      </p>

      {/* Renderizar o context menu fora da tabela */}
      {isEditable && contextMenu.contextMenu}

      {/* DEBUG: Mostrar tabela de histórico visível na interface */}
      {history && history.length > 0 && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          border: '2px solid #007bff', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa',
          display: 'none'
        }}>
          <h3 style={{ color: '#007bff', marginBottom: '15px' }}>
            🔍 DEBUG - Histórico de Alterações ({history.length} entradas)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
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
          <h3>⚠️ DEBUG - Nenhum histórico encontrado</h3>
          <p>History prop: {JSON.stringify(history)}</p>
        </div>
      )}
    </div>
  );
}