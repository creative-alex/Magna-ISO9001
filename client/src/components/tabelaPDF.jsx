import React, { useState } from "react";
import EditableTable from "./ProcessTable";
import ExportPdfButton from "./Buttons/exportPdf";

// Configuração do template 1
const headersObs1 = ["Observações"];
const headersHtmlObs1 = [<>Observações</>];
const headers1 = [
  'Fluxo\ndas Ações',
  'Descrição',
  'Responsável',
  'Documentos\nAssociados',
  'Instruções\nde Trabalho'
];
const headersHtml1 = [
  <>Fluxo<br />das Ações</>,
  <>Descrição</>,
  <>Responsável</>,
  <>Documentos<br />Associados</>,
  <>Instruções<br />de Trabalho</>
];

// Configuração do template 2 (ajustada para a imagem)
const headersObs2 = ["Observações"];
const headersHtmlObs2 = [<>Observações</>];

export default function TabelaPdf({ templateType = 1 }) {
  const isTemplate2 = templateType === 2;

  // Observações
  const [dataObs, setDataObs] = useState(
    Array.from({ length: isTemplate2 ? 3 : 5 }, () => [""])
  );
  const handleChangeObs = (rowIdx, colIdx, value) => {
    const newData = dataObs.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setDataObs(newData);
  };

  // Para o template 2, duas colunas: entrada e saída
  const [data, setData] = useState([["", ""]]); // só uma linha
  const handleChange = (rowIdx, colIdx, value) => {
    const newData = data.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setData(newData);
  };

  // Tabela "Principais Atividades"
 const [atividades, setAtividades] = useState([
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""],
]);
  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    const newData = atividades.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setAtividades(newData);
  };

  // Tabela "Indicadores de monitorização do processo"
  const [indicadores, setIndicadores] = useState([
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
  ]);
  const handleIndicadoresChange = (rowIdx, value) => {
    const newData = indicadores.map((row, r) =>
      r === rowIdx ? [value] : row
    );
    setIndicadores(newData);
  };

  // Dono do processo
  const [donoProcesso, setDonoProcesso] = useState("Administrador (Rui Pena)");
  // Objetivo do processo
  const [objetivoProcesso, setObjetivoProcesso] = useState("");

  // Função utilitária para escapar HTML e substituir \n por <br/>
  function escapeAndBreakLines(text) {
    return String(text).replace(/\n/g, "<br/>");
  }

  // Função para gerar HTML da tabela do template 2
  function generateTable2Html(data) {
    return `
      <table>
        <thead>
          <tr>
            <th >DONO DO PROCESSO<br/>(nomeado):</th>
            <td >${escapeAndBreakLines(donoProcesso)}</td>
          </tr>
          <tr>
            <th >OBJETIVO DO PROCESSO:</th>
            <td >
              ${escapeAndBreakLines(objetivoProcesso)}
            </td>
          </tr>
          <tr>
            <th>SERVIÇOS DE ENTRADAS</th>
            <th>SERVIÇO DE SAÍDA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <t>${escapeAndBreakLines(data[0][0])}</td>
            <t>${escapeAndBreakLines(data[0][1])}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // Função para gerar HTML da tabela do template 1
  function generateTable1Html(headers, data) {
    return `
      <table">
        <thead>
          <tr>
            ${headers.map(h => `<th>${escapeAndBreakLines(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${row.map(cell => `<td>${escapeAndBreakLines(cell)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  return (
    <div>
      {isTemplate2 ? (
        <>
          {/* Tabela principal */}
          <table border="1" cellPadding={4} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ textAlign: "left" }}>DONO DO PROCESSO<br/>(nomeado):</th>
                <td colSpan={4} style={{ textAlign: "left" }}>
                  <textarea
                    style={{ width: "100%" }}
                    value={donoProcesso}
                    onChange={e => setDonoProcesso(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: "left" }}>OBJETIVO DO PROCESSO:</th>
                <td colSpan={4} style={{ textAlign: "left" }}>
                  <textarea
                    style={{ width: "100%" }}
                    value={objetivoProcesso}
                    onChange={e => setObjetivoProcesso(e.target.value)}
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
                    style={{ width: "100%", minHeight: 120 }}
                    value={data[0][0]}
                    onChange={e => handleChange(0, 0, e.target.value)}
                  />
                </td>
                <td colSpan={3} style={{ verticalAlign: "top" }}>
                  <textarea
                    style={{ width: "100%", minHeight: 120 }}
                    value={data[0][1]}
                    onChange={e => handleChange(0, 1, e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabela Principais Atividades */}
          <table border="1" cellPadding={4} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>Principais Atividades</th>
                <th style={{ textAlign: "center" }}>Procedimentos Associados</th>
                <th style={{ textAlign: "center" }}>Requisitos ISO 9001</th>
                <th style={{ textAlign: "center" }}>Requisitos DGERT</th>
                <th style={{ textAlign: "center" }}>Requisitos EQAVET</th>
                <th style={{ textAlign: "center" }}>Requisitos CQCQ</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx}>
                      <textarea
                        style={{ width: "100%", minHeight: 30 }}
                        value={cell}
                        onChange={e => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tabela Indicadores de monitorização do processo */}
          <table border="1" cellPadding={4} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>Indicadores de monitorização do processo</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td>
                    <textarea
                      style={{ width: "100%", minHeight: 30 }}
                      value={row[0]}
                      onChange={e => handleIndicadoresChange(rowIdx, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ExportPdfButton
            data={data}
            headers={["SERVIÇOS DE ENTRADAS", "SERVIÇO DE SAÍDA"]}
            dataObs={dataObs}
            headersObs={["Observações"]}
            getTablesHtml={() => ({
              mainTableHtml: "", // Adapta se quiseres exportar as novas tabelas também
              obsTableHtml: ""
            })}
          />
        </>
      ) : (
        <>
          <EditableTable data={dataObs} onChange={handleChangeObs} headersHtml={headersHtmlObs1} />
          <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml1} />
          <ExportPdfButton
            data={data}
            headers={headers1}
            dataObs={dataObs}
            headersObs={headersObs1}
            getTablesHtml={() => ({
              mainTableHtml: "", // Adapta se quiseres exportar as novas tabelas também
              obsTableHtml: ""
            })}
          />
        </>
      )}
    </div>
  );
}