import React from "react";
import EditableTable from "../EditableTable";
import ExportPdfButton from "../Buttons/exportPdf";

export default function Template1({ 
  data, 
  dataObs, 
  handleChange, 
  handleChangeObs, 
  headers, 
  headersObs, 
  headersHtml, 
  headersHtmlObs,
  templateType = 1,
  servicosEntrada = "",
  servicoSaida = "",
  setServicosEntrada,
  setServicoSaida
}) {
  return (
    <>
      <EditableTable data={dataObs} onChange={handleChangeObs} headersHtml={headersHtmlObs} />
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />

    </>
  );
}
