import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
import "../index.css";

function FolderStructure({ nodes, onSelectFile, currentPath = [] }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const folders = nodes.filter(n => n.type === "folder");
  const files = nodes.filter(n => n.type === "file");

  const toggleFolder = (folderName) => {
    setExpandedFolder(expandedFolder === folderName ? null : folderName);
  };

  return (
    <div className="folder-structure">
      {folders.map(folder => (
        <div key={folder.name} className="folder">
          <div
            className={`folder-header ${expandedFolder === folder.name ? 'active' : ''}`}
            onClick={() => toggleFolder(folder.name)}
          >
            <span className="arrow">{expandedFolder === folder.name ? '▾' : '▸'}</span>
            <span className="folder-name">{folder.name}</span>
          </div>
          {expandedFolder === folder.name && (
            <div className="folder-content">
              <FolderStructure
                nodes={folder.children || []}
                onSelectFile={onSelectFile}
                currentPath={[...currentPath, folder.name]}
              />
            </div>
          )}
        </div>
      ))}

      {files.map(file => (
        <div key={file.name} className="file">
          <span className="file-name">{file.name}</span>
          <div className="file-actions">
            <button onClick={() => onSelectFile([...currentPath, file.name].join("/"))}>👁️</button>
            <button
              onClick={async () => {
                const res = await fetch("http://localhost:8080/files/get-pdf", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ path: file.path, name: file.name }),
                });
                const arrayBuffer = await res.arrayBuffer();

                // Torna o PDF não editável removendo todos os campos de formulário
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const form = pdfDoc.getForm();
                form.getFields().forEach(field => form.removeField(field));
                const nonEditablePdfBytes = await pdfDoc.save();

                const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, "_blank");
              }}
            >⬇️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SelecionarPdf() {
  const [pdfTree, setPdfTree] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8080/files/list-pdfs-tree")
      .then(res => res.json())
      .then(setPdfTree)
      .catch(() => setPdfTree([]));
  }, []);

  const handleSelectFile = (filePath) => {
    navigate(`/superadmin/${encodeURIComponent(filePath)}`);
  };

  return (
    <div className="pdf-container">
      <h2 className="title">Titulo Titulado</h2>
      <div className="pdf-panel">
        <div className="panel-title">Índice</div>
        <FolderStructure nodes={pdfTree} onSelectFile={handleSelectFile} />
      </div>
    </div>
  );
}