import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function FolderStructure({ nodes, onSelectFile, currentPath = [] }) {
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Filtra pastas e ficheiros do nível atual
  const folders = nodes.filter(n => n.type === "folder");
  const files = nodes.filter(n => n.type === "file");

  const handleFolderClick = (folderName) => {
    setSelectedFolder(folderName);
  };

  return (
    <div style={{ marginLeft: 20 }}>
      {/* Pastas */}
      {folders.map(folder => (
        <div key={folder.name} style={{ marginBottom: 8 }}>
          <button
            onClick={() => handleFolderClick(folder.name)}
            style={{ marginRight: 8 }}
          >
            📁 {folder.name}
          </button>
          
          {/* Subpastas/Ficheiros da pasta selecionada */}
          {selectedFolder === folder.name && (
            <FolderStructure
              nodes={folder.children || []}
              onSelectFile={onSelectFile}
              currentPath={[...currentPath, folder.name]}
            />
          )}
        </div>
      ))}

      {/* Ficheiros */}
      {files.map(file => (
        <div key={file.name} style={{ margin: "4px 0" }}>
          <button onClick={() => onSelectFile([...currentPath, file.name].join('/'))}>
            📄 {file.name}
          </button>
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
    <div>
      <h2>Super Admin - Selecionar PDF</h2>
      <label>Escolha um ficheiro PDF:</label>
      <FolderStructure nodes={pdfTree} onSelectFile={handleSelectFile} />
    </div>
  );
}
