import React from "react";
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
  donoProcessoOriginal = "", // Novo prop para valor original
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
  funcionarios = [], // Nova prop para lista de funcionários
  // Props para PreviewPdfButton
  getTablesHtml,
  // Funções para manipulação de linhas das atividades
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
}) {
  // Verifica se o dono do processo foi alterado
  const donoProcessoAlterado = donoProcesso !== donoProcessoOriginal;

  return (
    <div className="template2-container">
    {/* Tabela principal */}
<table className="tabela-processo">
  <thead>
    <tr>
      <th colSpan={2} style={{ textAlign: "left" }}>DONO DO PROCESSO<br/>(nomeado):</th>
      <td colSpan={4} style={{ textAlign: "left" }}>
        <div style={{ position: 'relative' }}>
          <select
            className="tabela-processo-select"
            value={donoProcesso}
            onChange={e => setDonoProcesso(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: donoProcessoAlterado ? '2px solid #ffc107' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: donoProcessoAlterado ? '#fff3cd' : 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Selecione um funcionário...</option>
            {funcionarios.map((funcionario) => (
              <option key={funcionario.id} value={funcionario.nome}>
                {funcionario.nome}
              </option>
            ))}
          </select>
          {donoProcessoAlterado && (
            <div style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#ffc107',
              color: '#856404',
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '3px',
              pointerEvents: 'none',
              fontWeight: 'bold'
            }}>
              Alterado
            </div>
          )}
        </div>
      </td>
    </tr>
    <tr>
      <th colSpan={2} style={{ textAlign: "left" }}>OBJETIVO DO PROCESSO:</th>
      <td colSpan={4} style={{ textAlign: "left" }}>
        <textarea
          className="tabela-processo-textarea"
          value={objetivoProcesso}
          onChange={e => setObjetivoProcesso(e.target.value)}
          placeholder="Descreva o objetivo principal do processo..."
        />
      </td>
    </tr>
    <tr>
      <th colSpan={3} style={{ textAlign: "center" }}>SERVIÇOS DE ENTRADAS</th>
      <th colSpan={3} style={{ textAlign: "center" }}>SERVIÇO DE SAÍDA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colSpan={3} style={{ verticalAlign: "top" }}>
        <textarea
          className="tabela-processo-textarea"
          style={{ minHeight: 120 }}
          value={servicosEntrada}
          onChange={e => setServicosEntrada(e.target.value)}
          placeholder="Descreva os serviços de entrada necessários..."
        />
      </td>
      <td colSpan={3} style={{ verticalAlign: "top" }}>
        <textarea
          className="tabela-processo-textarea"
          style={{ minHeight: 120 }}
          value={servicoSaida}
          onChange={e => setServicoSaida(e.target.value)}
          placeholder="Descreva o serviço de saída resultante..."
        />
      </td>
    </tr>
  </tbody>
</table>

{/* Tabela Principais Atividades */}
<table className="tabela-atividades">
  <thead>
    <tr>
      <th style={{ minWidth: '150px' }}>Principais Atividades</th>
      <th style={{ minWidth: '150px' }}>Procedimentos Associados</th>
      <th style={{ minWidth: '120px' }}>Requisitos ISO 9001</th>
      <th style={{ minWidth: '120px' }}>Requisitos DGERT</th>
      <th style={{ minWidth: '120px' }}>Requisitos EQAVET</th>
      <th style={{ minWidth: '120px' }}>Requisitos CQCQ</th>
      <th style={{ minWidth: '80px', textAlign: 'center' }}>Ações</th>
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
            <td key={colIdx} data-label={labels[colIdx]} style={{ padding: '8px' }}>
              <input
                type="text"
                className="tabela-atividades-input"
                value={cell}
                onChange={e => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                placeholder={`${colIdx === 0 ? 'Atividade' : colIdx === 1 ? 'Procedimento' : 'Requisito'}...`}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '32px'
                }}
              />
            </td>
          );
        })}
        <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            minWidth: '80px'
          }}>
            <button 
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: rowIdx === 0 ? 0.4 : 1,
                transition: 'all 0.2s ease',
                padding: '4px 6px',
                borderRadius: '4px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onMoveAtividadeUp && onMoveAtividadeUp(rowIdx)}
              disabled={rowIdx === 0}
              title="Mover para cima"
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#e9ecef';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ↑
            </button>
            
            <button 
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: rowIdx === atividades.length - 1 ? 0.4 : 1,
                transition: 'all 0.2s ease',
                padding: '4px 6px',
                borderRadius: '4px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onMoveAtividadeDown && onMoveAtividadeDown(rowIdx)}
              disabled={rowIdx === atividades.length - 1}
              title="Mover para baixo"
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#e9ecef';
                  e.target.style.transform = 'translateY(1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ↓
            </button>
            
            <button 
              style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                padding: '4px 6px',
                borderRadius: '4px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#155724'
              }}
              onClick={() => onInsertAtividadeAbove && onInsertAtividadeAbove(rowIdx)}
              title="Inserir linha acima"
              onMouseEnter={(e) => {
                e.target.style.background = '#c3e6cb';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#d4edda';
                e.target.style.transform = 'scale(1)';
              }}
            >
              +
            </button>
            
            <button 
              style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                padding: '4px 6px',
                borderRadius: '4px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#155724'
              }}
              onClick={() => onInsertAtividadeBelow && onInsertAtividadeBelow(rowIdx)}
              title="Inserir linha abaixo"
              onMouseEnter={(e) => {
                e.target.style.background = '#c3e6cb';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#d4edda';
                e.target.style.transform = 'scale(1)';
              }}
            >
              +
            </button>
            
            {atividades.length > 1 && (
              <button 
                style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  minWidth: '28px',
                  minHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#721c24'
                }}
                onClick={() => onDeleteAtividade && onDeleteAtividade(rowIdx)}
                title="Deletar linha"
                onMouseEnter={(e) => {
                  e.target.style.background = '#f5c6cb';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8d7da';
                  e.target.style.transform = 'scale(1)';
                }}
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
      <th style={{ textAlign: "center" }}>Indicadores de monitorização do processo</th>
    </tr>
  </thead>
  <tbody>
    {(indicadores || []).map((indicador, rowIdx) => (
      <tr key={rowIdx}>
        <td>
          <textarea
            className="tabela-indicadores-textarea"
            style={{ minHeight: 60 }}
            value={indicador}
            onChange={e => handleIndicadoresChange(rowIdx, e.target.value)}
            placeholder="Descreva o indicador de monitorização..."
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>

      <PreviewPdfButton getTablesHtml={getTablesHtml} />
    </div>
  );
}