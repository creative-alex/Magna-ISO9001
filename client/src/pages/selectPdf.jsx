import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import PdfPreviewButton from "../components/Buttons/pdfPreviewButton";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import "../index.css";

// Função recursiva para filtrar nodes por nome
function filterTree(nodes, searchTerm) {
  if (!searchTerm) return nodes;
  return nodes
    .map(node => {
      if (node.type === "folder") {
        const filteredChildren = filterTree(node.children || [], searchTerm);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return node;
      }
      return null;
    })
    .filter(Boolean);
}

function FolderStructure({ nodes, onSelectFile, currentPath = [], processOwners, currentUser, isAdmin, onDelete }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const folders = nodes.filter(n => n.type === "folder");
  const files = nodes.filter(n => n.type === "file");

  const toggleFolder = (folderName) => {
    setExpandedFolder(expandedFolder === folderName ? null : folderName);
  };

  // Função para verificar se o utilizador pode aceder a um processo
  const canAccessProcess = (filePath) => {
    if (isAdmin) return true; // SuperAdmin pode aceder a tudo
    
    // Extrai o nome do processo (primeira pasta do caminho)
    const processName = filePath.split('/')[0];
    const processOwner = processOwners[processName];
    
    // Se não há dono definido, permite acesso (para compatibilidade)
    if (!processOwner) return true;
    
    // Verifica se o utilizador atual é o dono
    return processOwner === currentUser;
  };

  return (
    <div className="folder-structure">
      {folders.map(folder => {
        // Para pastas de primeiro nível, mostra o dono se existir
        const isTopLevel = currentPath.length === 0;
        const folderOwner = isTopLevel ? processOwners[folder.name] : null;
        
        return (
          <div key={folder.name} className="folder">
            <div
              className={`folder-header ${expandedFolder === folder.name ? 'active' : ''}`}
              onClick={() => toggleFolder(folder.name)}
            >
              <span className="folder-name">
                {folder.name}
              </span>
              <div className="folder-actions" style={{ display: 'flex', alignItems: 'center' }}>
                {canAccessProcess([...currentPath, folder.name].join("/")) ? (
                  <CreateTableButton
                    folderName={folder.name}
                    currentPath={currentPath}
                  />
                ) : null}
              </div>
            </div>
          {expandedFolder === folder.name && (
            <div className="folder-content">
              <FolderStructure
                nodes={folder.children || []}
                onSelectFile={onSelectFile}
                currentPath={[...currentPath, folder.name]}
                processOwners={processOwners}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDelete={onDelete}
              />
            </div>
          )}
        </div>
        );
      })}

      {files.map(file => {
        const filePath = [...currentPath, file.name].join("/");
        const hasAccess = canAccessProcess(filePath);
        const displayName = file.name.endsWith('.pdf') ? file.name.slice(0, -4) : file.name;
        
        return (
          <div 
            key={file.name} 
            className={`file ${hasAccess ? 'file-clickable' : ''}`}
            onClick={hasAccess ? () => onSelectFile(filePath) : undefined}
            style={{ cursor: hasAccess ? 'pointer' : 'default' }}
          >
            <span className="file-name">{displayName}</span>
            <div className="file-actions">
              <PdfPreviewButton file={file} currentPath={currentPath} />
              {isAdmin && (
                <DeleteButton 
                  file={file} 
                  currentPath={currentPath} 
                  onDelete={onDelete} 
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SelecionarPdf() {
  const [pdfTree, setPdfTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [processOwners, setProcessOwners] = useState({}); 
  const navigate = useNavigate();
  const { username } = useContext(UserContext);

  // Verifica se é SuperAdmin
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  useEffect(() => {
    // Busca a árvore de PDFs
    fetch("http://192.168.1.219:8080/files/list-pdfs-tree")
      .then(res => res.json())
      .then(setPdfTree)
      .catch(() => setPdfTree([]));

    // Busca os donos dos processos
    fetch("http://192.168.1.219:8080/files/process-owners")
      .then(res => res.json())
      .then(setProcessOwners)
      .catch(() => setProcessOwners({}));
  }, []);

  // Função para recarregar a árvore de PDFs após eliminação
  const reloadPdfTree = () => {
    fetch("http://192.168.1.219:8080/files/list-pdfs-tree")
      .then(res => res.json())
      .then(setPdfTree)
      .catch(() => setPdfTree([]));
  };

  const handleSelectFile = (filePath) => {
    // Substitui espaços por '-', barras por '__'
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  // Filtra a árvore conforme o termo de busca
  const filteredTree = filterTree(pdfTree, searchTerm);

  return (
    <div className="pdf-container">
      <h2 className="title">SISTEMA ISO 9001</h2>
      <input
        type="text"
        placeholder="Encontrar arquivo ou pasta..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <div className="pdf-panel">
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="panel-title">Índice</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <AddUserButton />
            <AddProcessButton />
          </div>
        )}
      </div>
        <FolderStructure 
          nodes={filteredTree} 
          onSelectFile={handleSelectFile} 
          processOwners={processOwners}
          currentUser={username}
          isAdmin={isAdmin}
          onDelete={reloadPdfTree}
        />
      </div>
    </div>
  );
};
