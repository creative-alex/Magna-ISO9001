import React from "react";
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

export default function TabelaPdf({
  templateType = 1,
  data,
  dataObs,
  handleChangeMain,
  handleChangeObs,
  headers,
  headersObs
}) {
  const isTemplate2 = templateType === 2;

  return (
    <div>
      {isTemplate2 ? (
        <Template2
          data={data}
          dataObs={dataObs}
          handleChange={handleChangeMain}
          headers={headers}
          headersObs={headersObs}
        />
      ) : (
        <Template1
          data={data}
          dataObs={dataObs}
          handleChange={handleChangeMain}
          handleChangeObs={handleChangeObs}
          headers={headers}
          headersObs={headersObs}
        />
      )}
    </div>
  );
}
