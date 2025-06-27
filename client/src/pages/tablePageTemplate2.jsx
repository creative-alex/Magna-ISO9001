import React, { useState, useRef } from "react";
import EditableTable from "../components/ProcessTable";
import ExportPdfButton from "../components/Buttons/exportPdf";
import PreviewPdfButton from "../components/Buttons/previewPDF";

const tabelasTemplate2 = [
  {
    key: "obs",
    headers: ["Observações"],
    rows: 3,
    cols: 1
  },
  {
    key: "main",
    headers: [
      <>Etapa</>,
      <>Descrição</>,
      <>Responsável</>,
      <>Notas</>
    ],
    rows: 3,
    cols: 4
  }
];

export default function TablePageTemplate2() {
  const [tableData, setTableData] = useState({
    obs: Array.from({ length: tabelasTemplate2[0].rows }, () => Array(tabelasTemplate2[0].cols).fill("")),
    main: Array.from({ length: tabelasTemplate2[1].rows }, () => Array(tabelasTemplate2[1].cols).fill(""))
  });

  const mainTableRef = useRef(null);
  const obsTableRef = useRef(null);

  const getTablesHtml = () => ({
    mainTableHtml: mainTableRef.current ? mainTableRef.current.outerHTML : "",
    obsTableHtml: obsTableRef.current ? obsTableRef.current.outerHTML : ""
  });

  return (
    <div>
      <h2>Template 2</h2>
      <div ref={obsTableRef}>
        <EditableTable
          data={tableData.obs}
          onChange={(rowIdx, colIdx, value) =>
            setTableData(prev => {
              const newData = prev.obs.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, obs: newData };
            })
          }
          headersHtml={tabelasTemplate2[0].headers}
        />
      </div>
      <div ref={mainTableRef}>
        <EditableTable
          data={tableData.main}
          onChange={(rowIdx, colIdx, value) =>
            setTableData(prev => {
              const newData = prev.main.map(row => [...row]);
              newData[rowIdx][colIdx] = value;
              return { ...prev, main: newData };
            })
          }
          headersHtml={tabelasTemplate2[1].headers}
        />
      </div>
      <ExportPdfButton
        data={tableData.main}
        headers={tabelasTemplate2[1].headers}
        dataObs={tableData.obs}
        headersObs={tabelasTemplate2[0].headers}
        getTablesHtml={getTablesHtml}
      />
      <PreviewPdfButton getTablesHtml={getTablesHtml} />
    </div>
  );
}