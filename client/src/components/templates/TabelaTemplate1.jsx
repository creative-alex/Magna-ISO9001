import React from "react";
import EditableTable from "../EditableTable";
import ExportPdfButton from "../Buttons/exportPdf";

export default function Template1({ data, dataObs, handleChange, handleChangeObs, headers, headersObs, headersHtml, headersHtmlObs }) {
  return (
    <>
      <EditableTable data={dataObs} onChange={handleChangeObs} headersHtml={headersHtmlObs} />
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />
      <ExportPdfButton
        data={data}
        headers={headers}
        dataObs={dataObs}
        headersObs={headersObs}
        getTablesHtml={() => ({
          mainTableHtml: "",
          obsTableHtml: ""
        })}
      />
    </>
  );
}
