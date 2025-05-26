import React, { useEffect, useState } from "react";
import EditableTable from "../components/editTable";
import ExportPdfButton from "../components/Buttons/exportPdf";

const headers = [
  'Fluxo\ndas Ações',
  'Descrição',
  'Responsável',
  'Documentos\nAssociados',
  'Instruções\nde Trabalho'
];
const headersHtml = [
  <>Fluxo<br />das Ações</>,
  <>Descrição</>,
  <>Responsável</>,
  <>Documentos<br />Associados</>,
  <>Instruções<br />de Trabalho</>
];

const fieldNames = [
  // Os nomes dos campos do PDF editável, na ordem da tabela
  // Exemplo: ["table2_r2_c1", "table2_r2_c2", ...]
  // Preencha conforme o nome dos campos que você usou ao gerar o PDF
  [
    "table2_r2_c1", "table2_r2_c2", "table2_r2_c3", "table2_r2_c4", "table2_r2_c5"
  ],
  [
    "table2_r3_c1", "table2_r3_c2", "table2_r3_c3", "table2_r3_c4", "table2_r3_c5"
  ],
  [
    "table2_r4_c1", "table2_r4_c2", "table2_r4_c3", "table2_r4_c4", "table2_r4_c5"
  ],
  [
    "table2_r5_c1", "table2_r5_c2", "table2_r5_c3", "table2_r5_c4", "table2_r5_c5"
  ],
  [
    "table2_r6_c1", "table2_r6_c2", "table2_r6_c3", "table2_r6_c4", "table2_r6_c5"
  ],
  [
    "table2_r7_c1", "table2_r7_c2", "table2_r7_c3", "table2_r7_c4", "table2_r7_c5"
  ]
];

export default function SuperAdmin() {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [data, setData] = useState(Array.from({ length: 6 }, () => Array(5).fill("")));

  // Buscar lista de PDFs ao carregar
  useEffect(() => {
    fetch("http://localhost:8080/files/list-pdfs")
      .then(res => res.json())
      .then(setPdfFiles)
      .catch(() => setPdfFiles([]));
  }, []);

  // Buscar dados do PDF selecionado
  useEffect(() => {
    if (!selectedFile) return;
    fetch(`http://localhost:8080/files/pdf-form-data?filename=${encodeURIComponent(selectedFile)}`)
      .then(res => res.json())
      .then(formData => {
        // Monta a matriz data a partir dos nomes dos campos
        const newData = fieldNames.map(row =>
          row.map(field => formData[field] || "")
        );
        setData(newData);
      });
  }, [selectedFile]);

  const handleChange = (rowIdx, colIdx, value) => {
    const newData = data.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
    );
    setData(newData);
  };

  return (
    <div>
      <h2>Super Admin - Listar e Editar PDFs</h2>
      <div>
        <label>Escolha um ficheiro PDF:&nbsp;</label>
        <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
          <option value="">Selecione...</option>
          {pdfFiles.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      <EditableTable data={data} onChange={handleChange} headersHtml={headersHtml} />
      <div style={{ marginTop: 16 }}>
        <ExportPdfButton data={data} headers={headers} />
      </div>
    </div>
  );
}