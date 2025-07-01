import React, { useState } from "react";
import Template1 from "./templates/TabelaTemplate1";
import Template2 from "./templates/TabelaTemplate2";

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
  const [data, setData] = useState([["", ""]]);
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

  return (
    <div>
      {isTemplate2 ? (
        <Template2
          data={data}
          dataObs={dataObs}
          handleChange={handleChange}
          handleAtividadesChange={handleAtividadesChange}
          handleIndicadoresChange={handleIndicadoresChange}
          donoProcesso={donoProcesso}
          setDonoProcesso={setDonoProcesso}
          objetivoProcesso={objetivoProcesso}
          setObjetivoProcesso={setObjetivoProcesso}
          atividades={atividades}
          indicadores={indicadores}
        />
      ) : (
        <Template1
          data={data}
          dataObs={dataObs}
          handleChange={handleChange}
          handleChangeObs={handleChangeObs}
          headers={headers1}
          headersObs={headersObs1}
          headersHtml={headersHtml1}
          headersHtmlObs={headersHtmlObs1}
        />
      )}
    </div>
  );
};
