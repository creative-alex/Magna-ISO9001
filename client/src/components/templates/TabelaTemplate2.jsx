import React from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import "./styleTemplates.css"; 


export default function Template2({
  data = [[ "", "" ]],
  handleChange,
  handleAtividadesChange,
  handleIndicadoresChange,
  donoProcesso = "",
  setDonoProcesso,
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
  // Funções para manipulação de linhas das atividades
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
}) {
  return (
    <div className="template2-container">
    {/* Tabela principal */}
<table className="tabela-processo">
  <thead>
    <tr>
      <th colSpan={2} style={{ textAlign: "left" }}>DONO DO PROCESSO<br/>(nomeado):</th>
      <td colSpan={4} style={{ textAlign: "left" }}>
        <textarea
          className="tabela-processo-textarea"
          value={donoProcesso}
          onChange={e => setDonoProcesso(e.target.value)}
          placeholder="Digite o nome do responsável pelo processo..."
        />
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
              <input
                type="text"
                className="tabela-atividades-input"
                value={cell}
                onChange={e => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                placeholder={`${colIdx === 0 ? 'Atividade' : colIdx === 1 ? 'Procedimento' : 'Requisito'}...`}
              />
            </td>
          );
        })}
        <td>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '2px', 
            padding: '2px',
            width: '100%'
          }}>
            <button 
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: rowIdx === 0 ? 0.3 : 0.7,
                transition: 'all 0.15s ease',
                padding: '2px',
                borderRadius: '3px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onMoveAtividadeUp && onMoveAtividadeUp(rowIdx)}
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
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: rowIdx === atividades.length - 1 ? 0.3 : 0.7,
                transition: 'all 0.15s ease',
                padding: '2px',
                borderRadius: '3px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onMoveAtividadeDown && onMoveAtividadeDown(rowIdx)}
              disabled={rowIdx === atividades.length - 1}
              title="Mover para baixo"
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.opacity = '1';
                  e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                  e.target.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = rowIdx === atividades.length - 1 ? '0.3' : '0.7';
                e.target.style.background = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ⬇️
            </button>
            <button 
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: 0.7,
                transition: 'all 0.15s ease',
                padding: '2px',
                borderRadius: '3px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onInsertAtividadeAbove && onInsertAtividadeAbove(rowIdx)}
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
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: 0.7,
                transition: 'all 0.15s ease',
                padding: '2px',
                borderRadius: '3px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => onInsertAtividadeBelow && onInsertAtividadeBelow(rowIdx)}
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
            {atividades.length > 1 && (
              <button 
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: 0.7,
                  transition: 'all 0.15s ease',
                  padding: '2px',
                  borderRadius: '3px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => onDeleteAtividade && onDeleteAtividade(rowIdx)}
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

    </div>
  );
}