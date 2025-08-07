import React, { useRef, useEffect } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import "./styleTemplates.css";

export default function Template1({ 
  data = [["", "", "", "", ""]],
  dataObs = [[""]],
  handleChange, 
  handleChangeObs, 
  templateType = 1,
  servicosEntrada = "",
  servicoSaida = "",
  setServicosEntrada,
  setServicoSaida,
  // Props para ExportPdfButton
  atividades,
  donoProcesso,
  objetivoProcesso,
  indicadores,
  pathFilename,
  fieldNames,
  onSaveSuccess,
  // Props para PreviewPdfButton
  getTablesHtml,
  // Refs para as tabelas
  obsTableRef,
  mainTableRef,
  // Funções para manipulação de linhas
  onMoveRowUp,
  onMoveRowDown,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onAddRowObs,
  onDeleteRowObs
}) {
  const textAreaRefs = useRef({});

  // Função para redimensionar textarea automaticamente
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    // Reset height to auto to get proper scrollHeight
    textarea.style.height = 'auto';
    // Set height to match content
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

  return (
    <>
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
                  onChange={e => handleChangeObs(0, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite os objetivos do documento..."
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
                  onChange={e => handleChangeObs(1, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite o campo de aplicação..."
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
                  onChange={e => handleChangeObs(2, 0, e.target.value)} 
                  onInput={handleTextareaResize}
                  placeholder="Digite as definições relevantes..."
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
                  onChange={e => handleChangeObs(3, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite as abreviaturas utilizadas..."
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
                  onChange={e => handleChangeObs(4, 0, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder="Digite observações adicionais..."
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
              <th className="editable-table-header col-documentos">Documentos<br />Associados</th>
              <th className="editable-table-header col-instrucoes">Instruções<br />de Trabalho</th>
              <th className="editable-table-header col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="editable-table-row">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="editable-table-cell">
                    <textarea
                      ref={el => textAreaRefs.current[`main-${rowIdx}-${colIdx}`] = el}
                      className="editable-table-textarea tabela-principal-textarea"                      
                      value={cell}
                      onChange={e => handleChange(rowIdx, colIdx, e.target.value)}
                      onInput={handleTextareaResize}
                      placeholder={
                        colIdx === 0 ? 'Fluxo' :
                        colIdx === 1 ? 'Descrição' :
                        colIdx === 2 ? 'Responsável' :
                        colIdx === 3 ? 'Documentos' :
                        'Instruções'
                      }
                    />
                  </td>
                ))}
                <td className="editable-table-cell">
                  <div>
                    <button 
                      className="action-button"
                      onClick={() => onMoveRowUp && onMoveRowUp(rowIdx)}
                      disabled={rowIdx === 0}
                      title="Mover para cima"
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.opacity = '1';
                          e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                          e.target.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = rowIdx === 0 ? '0.3' : '0.7';
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ⬆️
                    </button>
                    <button
                      className="action-button"
                      onClick={() => onMoveRowDown && onMoveRowDown(rowIdx)}
                      disabled={rowIdx === data.length - 1}
                      title="Mover para baixo"
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.opacity = '1';
                          e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                          e.target.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = rowIdx === data.length - 1 ? '0.3' : '0.7';
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ⬇️
                    </button>
                    <button
                      className="action-button"
                      onClick={() => onInsertRowAbove && onInsertRowAbove(rowIdx)}
                      title="Inserir linha acima"
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.7';
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ➕
                    </button>
                    <button
                      className="action-button"
                      onClick={() => onInsertRowBelow && onInsertRowBelow(rowIdx)}
                      title="Inserir linha abaixo"
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.7';
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ➕
                    </button>
                    {data.length > 1 && (
                      <button 
                        className="action-button"
                        onClick={() => onDeleteRow && onDeleteRow(rowIdx)}
                        title="Deletar linha"
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '1';
                          e.target.style.background = 'rgba(255, 0, 0, 0.1)';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.7';
                          e.target.style.background = 'transparent';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        onSaveSuccess={onSaveSuccess}
      />
      <PreviewPdfButton getTablesHtml={getTablesHtml} />
    </>
  );
}