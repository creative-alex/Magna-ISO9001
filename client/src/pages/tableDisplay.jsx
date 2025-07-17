import React from "react";
import Template1 from "../components/templates/TabelaTemplate1";
import Template2 from "../components/templates/TabelaTemplate2";

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
  handleChange,
  headers,
  headersObs,
  donoProcesso,
  setDonoProcesso,
  objetivoProcesso,
  setObjetivoProcesso,
  atividades,
  handleAtividadesChange,
  indicadores,
  handleIndicadoresChange,
  servicosEntrada,
  setServicosEntrada,
  servicoSaida,
  setServicoSaida,
}) {
  const isTemplate2 = templateType === 2;

 return (
    <div>
      {isTemplate2 ? (
        <Template2
          data={data}
          dataObs={dataObs}
          handleChange={handleChange}
          headers={headers}
          headersObs={headersObs}
          donoProcesso={donoProcesso}
          setDonoProcesso={setDonoProcesso}
          objetivoProcesso={objetivoProcesso}
          setObjetivoProcesso={setObjetivoProcesso}
          atividades={atividades}
          handleAtividadesChange={handleAtividadesChange}
          indicadores={indicadores}
          handleIndicadoresChange={handleIndicadoresChange}
          servicosEntrada={servicosEntrada}
          setServicosEntrada={setServicosEntrada}
          servicoSaida={servicoSaida}
          setServicoSaida={setServicoSaida}
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
