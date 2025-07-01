import React from "react";
import ExportPdfButton from "../Buttons/exportPdf";

export default function Template2({
  data,
  dataObs,
  handleChange,
  handleAtividadesChange,
  handleIndicadoresChange,
  donoProcesso,
  setDonoProcesso,
  objetivoProcesso,
  setObjetivoProcesso,
  atividades,
  indicadores
}) {
  return (
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
          mainTableHtml: "",
          obsTableHtml: ""
        })}
      />
    </>
  );
}
