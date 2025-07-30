import React from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import "../../index.css"; 


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