import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import DocumentosAssociados from "../DocumentosAssociados";
import InstrucoesTrabalho from "../InstrucoesTrabalho";
import useRowContextMenu from "../ContextMenu/useRowContextMenu";
import { parseFormattedText } from "../../utils/textFormatting";
import { FaXmark, FaArrowLeft, FaPencil } from "react-icons/fa6";

export default function Template1({
  isEditable = false,
  setIsEditable,
  canEdit = true,
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
    textarea.style.height = `${Math.max(textarea.scrollHeight, 32)}px`;
  };

  // Redimensiona todos os textareas quando os dados mudam
  useEffect(() => {
    Object.values(textAreaRefs.current).forEach(textarea => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(textarea.scrollHeight, 32)}px`;
      }
    });
  }, [data, dataObs]);

  {/*Faz o originalNameFile dar quebra de linha ao título*/}
  const processTitle = () => {
    if (!originalFilename) return [''];
    // Remove a extensão .pdf se existir
    const nameWithoutExtension = originalFilename.replace(/\.pdf$/i, '');
    const parts = nameWithoutExtension.split('/');
    // Adiciona "Procedimento" antes da segunda parte
    if (parts.length > 1 && parts[1]) {
      parts[1] = `Procedimento ${parts[1]}`;
    }
    return parts;
  };
  const Title = processTitle();

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
          // Aplica formatação a todas as colunas
          const value = data[rowIdx] ? data[rowIdx][colIdx] : '';

          // Coluna 3 - Documentos Associados
          if (colIdx === 3) {
            console.log(`🔍 DEBUG Template1 - Linha ${rowIdx}, Coluna ${colIdx} (Documentos):`, value);
            cell.innerHTML = parseFormattedText(value);
          }
          // Coluna 4 - Instruções de trabalho
          else if (colIdx === 4) {
            console.log(`🔍 DEBUG Template1 - Linha ${rowIdx}, Coluna ${colIdx} (Instruções):`, value);
            cell.innerHTML = parseFormattedText(value);
          }
          // Outras colunas também suportam formatação
          else {
            cell.innerHTML = parseFormattedText(value);
          }
        });
      });

      mainTableHtml = mainTableClone.outerHTML;
    }

    if (obsTableRef && obsTableRef.current) {
      obsTableHtml = obsTableRef.current.outerHTML;
    }

    return {
      mainTableHtml,
      obsTableHtml
    };
  };

  // Tailwind classes reused across table cells/textareas
  const cellClass = "p-0 bg-[inherit] relative h-auto overflow-hidden break-words w-full max-w-full box-border border border-gray-200 align-top text-[14px]";
  const textareaClass = "w-full h-full border-0 bg-transparent px-3 py-2 font-[inherit] text-[14px] text-gray-700 leading-[1.3] resize-none overflow-hidden break-words min-h-8 max-w-full box-border block whitespace-pre-wrap m-0 focus:outline-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#C8932F] focus:rounded placeholder:text-gray-400 placeholder:italic";
  const headerClass = "bg-[#C8932F] text-white px-5 py-4 font-bold uppercase text-[11px] border-0 tracking-[0.8px] text-center border-b-[3px] border-b-[#b8832a] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] relative";
  const rowClass = "transition-colors duration-200 border-b border-gray-200 hover:bg-gray-50 even:bg-[#fafbfc] even:hover:bg-gray-100";
  const sectionHeaderClass = "font-bold p-[5px] bg-gray-50 border border-gray-200 text-left";

  return (
    <div
      className="flex flex-col items-center justify-start p-10 w-[80vw] max-w-full mx-auto bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-200 overflow-visible"
      style={{ alignItems: 'flex-start' }}
    >
      {/* Header */}
      <div className="text-left m-0 p-0 w-full self-start flex justify-between items-center mb-4">
        <h2 className="text-[1.6rem] font-bold text-gray-900 m-0">
          {Title.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < Title.length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
        {/* Botão de retroceder página */}
        <button
          onClick={() => history && history.length > 0 ? window.history.back() : null}
          title="Voltar à página anterior"
          className="text-orange-500 border-0 bg-transparent cursor-pointer mr-2.5 inline-flex items-center gap-[5px] text-base max-md:hidden"
        >
          <FaArrowLeft size={14} />
          <span>Retroceder</span>
        </button>
      </div>

      {/* Action buttons sempre fixos no canto inferior direito */}
      <div style={{ position: 'fixed', bottom: 90, right: 20, zIndex: 1001, display: 'flex', gap: '12px' }}>
        {setIsEditable && canEdit && (
          !isEditable ? (
            <button
              onClick={() => setIsEditable(true)}
              title="Ativar modo de edição"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              }}
            >
              <FaPencil size={18} />
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
                setIsEditable(false);
              }}
            />
          )
        )}
        <PreviewPdfButton
          getTablesHtml={getTemplate1TablesHtml}
          pathFilename={pathFilename}
          history={history}
          templateType={templateType}
          atividades={atividades}
          donoProcesso={donoProcesso}
          objetivoProcesso={objetivoProcesso}
          indicadores={indicadores}
          servicosEntrada={servicosEntrada}
          servicoSaida={servicoSaida}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            cursor: 'pointer',
          }}
        />
        {isEditable && setIsEditable && (
          <button
            onClick={() => setIsEditable(false)}
            title="Cancelar Edição"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              backgroundColor: '#e53935',
              color: 'white',
            }}
          >
            <FaXmark size={20} />
          </button>
        )}
      </div>


      {/* Tabela de Observações */}
      <div ref={obsTableRef} className="mb-5 rounded-md border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-full overflow-x-auto">
        <table className="w-full border-collapse font-sans bg-white table-fixed min-w-full break-words" border="1" cellPadding={4}>
          <thead>
            <tr>
              <th className={headerClass}>Seções do Documento</th>
            </tr>
          </thead>
          <tbody>
            {/* Objetivos */}
            <tr className={rowClass}>
              <th className={sectionHeaderClass}>1. Objetivos:</th>
            </tr>
            <tr className={rowClass}>
              <td className={cellClass}>
                <textarea
                  ref={el => textAreaRefs.current[`obj-0-0`] = el}
                  className={`${textareaClass} min-h-[45px]`}
                  value={dataObs[0] ? dataObs[0][0] : ''}
                  onChange={e => handleChangeObs(0, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite os objetivos do documento..."
                  disabled={!isEditable}
                />
              </td>
            </tr>

            {/* Campo de Aplicação */}
            <tr className={rowClass}>
              <th className={sectionHeaderClass}>2. Campo de Aplicação:</th>
            </tr>
            <tr className={rowClass}>
              <td className={cellClass}>
                <textarea
                  ref={el => textAreaRefs.current[`campo-1-0`] = el}
                  className={`${textareaClass} min-h-[45px]`}
                  value={dataObs[1] ? dataObs[1][0] : ''}
                  onChange={e => handleChangeObs(1, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite o campo de aplicação..."
                  disabled={!isEditable}
                />
              </td>
            </tr>

            {/* Definições */}
            <tr className={rowClass}>
              <th className={sectionHeaderClass}>3. Definições:</th>
            </tr>
            <tr className={rowClass}>
              <td className={cellClass}>
                <textarea
                  ref={el => textAreaRefs.current[`def-2-0`] = el}
                  className={`${textareaClass} min-h-[45px]`}
                  value={dataObs[2] ? dataObs[2][0] : ''}
                  onChange={e => handleChangeObs(2, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite as definições relevantes..."
                  disabled={!isEditable}
                />
              </td>
            </tr>

            {/* Abreviaturas */}
            <tr className={rowClass}>
              <th className={sectionHeaderClass}>4. Abreviaturas:</th>
            </tr>
            <tr className={rowClass}>
              <td className={cellClass}>
                <textarea
                  ref={el => textAreaRefs.current[`abrev-3-0`] = el}
                  className={`${textareaClass} min-h-[45px]`}
                  value={dataObs[3] ? dataObs[3][0] : ''}
                  onChange={e => handleChangeObs(3, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite as abreviaturas utilizadas..."
                  disabled={!isEditable}
                />
              </td>
            </tr>

            {/* Observações */}
            <tr className={rowClass}>
              <th className={sectionHeaderClass}>5. Observações:</th>
            </tr>
            <tr className={rowClass}>
              <td className={cellClass}>
                <textarea
                  ref={el => textAreaRefs.current[`obs-4-0`] = el}
                  className={`${textareaClass} min-h-[45px]`}
                  value={dataObs[4] ? dataObs[4][0] : ''}
                  onChange={e => handleChangeObs(4, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite observações adicionais..."
                  disabled={!isEditable}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabela Principal */}
      <div ref={mainTableRef} className="mb-5 rounded-md border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-full overflow-x-auto">
        <table className="w-full border-collapse font-sans bg-white table-fixed min-w-full break-words" border="1" cellPadding={4}>
          <thead>
            <tr>
              <th className={`${headerClass} w-[12%] min-w-[90px]`}>Fluxo<br />das Ações</th>
              <th className={`${headerClass} w-[40%] min-w-[300px]`}>Descrição</th>
              <th className={`${headerClass} w-[16%] min-w-[120px]`}>Responsável</th>
              <th className={`${headerClass} w-[7%] min-w-[120px]`}>Documentos<br/>Associados</th>
              <th className={`${headerClass} w-[7%] min-w-[120px]`}>Instruções<br/>de Trabalho</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={rowClass}
                onContextMenu={isEditable ? (e) => contextMenu.handleContextMenuEvent(e, rowIdx) : undefined}
              >
                {row.map((cell, colIdx) => {
                  const dataLabels = [
                    "Fluxo das Ações",
                    "Descrição",
                    "Responsável",
                    "Documentos Associados",
                    "Instruções de Trabalho"
                  ];
                  return (
                    <td
                      key={colIdx}
                      className={cellClass}
                      data-label={dataLabels[colIdx]}
                    >
                      {colIdx === 3 ? (
                        <DocumentosAssociados
                          currentValue={cell}
                          onChange={isEditable ? (value) => handleChange(rowIdx, colIdx, value) : undefined}
                          originalFilename={originalFilename}
                          isEditable={isEditable}
                          canEdit={canEdit}
                        />
                      ) : colIdx === 4 ? (
                        <InstrucoesTrabalho
                          currentValue={cell}
                          onChange={isEditable ? (value) => handleChange(rowIdx, colIdx, value) : undefined}
                          originalFilename={originalFilename}
                          isEditable={isEditable}
                          canEdit={canEdit}
                        />
                      ) : (
                        <textarea
                          ref={el => textAreaRefs.current[`main-${rowIdx}-${colIdx}`] = el}
                          className={`${textareaClass} min-h-[35px]`}
                          value={cell}
                          onChange={e => handleChange(rowIdx, colIdx, e.target.value)}
                          onInput={handleTextareaResize}
                          disabled={!isEditable}
                          placeholder={
                            colIdx === 0 ? 'Fluxo' :
                            colIdx === 1 ? 'Descrição' :
                            colIdx === 2 ? 'Responsável' :
                            colIdx === 3 ? 'Documentos' :
                            'Instruções'
                          }
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-gray-500 italic mt-[-15px] mb-[15px]">
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
