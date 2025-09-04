import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import FilePreviewButton from "../components/Buttons/pdfPreviewButton";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import Logo from "../logo.svg"
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

  // Função para ordenar nós: arquivos primeiro, depois pastas "Informação documentada" correspondentes
  const sortNodes = (nodes) => {
    const folders = nodes.filter(n => n.type === "folder");
    const files = nodes.filter(n => n.type === "file");
    
    // Função para extrair número de um nome
    const extractNumber = (name) => {
      // Primeiro tenta encontrar número no início
      let match = name.match(/^(\d+)/);
      if (match) return match[1];
      
      // Se não encontrar no início, procura por "procedimento XX" ou similar
      match = name.match(/procedimento\s+(\d+)/i);
      if (match) return match[1];
      
      // Procura qualquer número no nome
      match = name.match(/(\d+)/);
      if (match) return match[1];
      
      return 'other';
    };
    
    // Cria grupos baseados nos números (ex: "00", "01", etc.)
    const groups = new Map();
    
    // Adiciona arquivos aos grupos
    files.forEach(file => {
      const number = extractNumber(file.name);
      if (!groups.has(number)) {
        groups.set(number, { files: [], folders: [] });
      }
      groups.get(number).files.push(file);
    });
    
    // Adiciona pastas aos grupos
    folders.forEach(folder => {
      const number = extractNumber(folder.name);
      if (!groups.has(number)) {
        groups.set(number, { files: [], folders: [] });
      }
      groups.get(number).folders.push(folder);
    });
    
    // Ordena os grupos numericamente
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'other') return 1;
      if (b[0] === 'other') return -1;
      return parseInt(a[0]) - parseInt(b[0]);
    });
    
    // Constrói a lista final: para cada grupo, arquivos primeiro, depois pastas
    const result = [];
    sortedGroups.forEach(([number, group]) => {
      // Ordena arquivos dentro do grupo
      group.files.sort((a, b) => a.name.localeCompare(b.name));
      result.push(...group.files);
      
      // Ordena pastas dentro do grupo
      group.folders.sort((a, b) => a.name.localeCompare(b.name));
      result.push(...group.folders);
    });
    
    return result;
  };

  const sortedNodes = sortNodes(nodes);

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
      {sortedNodes.map(node => {
        if (node.type === "folder") {
          // Para pastas de primeiro nível, mostra o dono se existir
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          
          return (
            <div key={node.name} className="folder">
              <div
                className={`folder-header ${expandedFolder === node.name ? 'active' : ''}`}
                onClick={() => toggleFolder(node.name)}
              >
                <span className="folder-name">
                  {node.name}
                </span>
                <div className="folder-actions" style={{ display: 'flex', alignItems: 'center' }}>
                  {canAccessProcess([...currentPath, node.name].join("/")) && currentPath.length === 0 ? (
                    <CreateTableButton
                      folderName={node.name}
                      currentPath={currentPath}
                    />
                  ) : null}
                </div>
              </div>
            {expandedFolder === node.name && (
              <div className="folder-content">
                <FolderStructure
                  nodes={node.children || []}
                  onSelectFile={onSelectFile}
                  currentPath={[...currentPath, node.name]}
                  processOwners={processOwners}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
          );
        } else {
          // node.type === "file"
          const filePath = [...currentPath, node.name].join("/");
          const hasAccess = canAccessProcess(filePath);
          
          // Remove a extensão apenas para PDFs para manter compatibilidade
          const displayName = node.name.endsWith('.pdf') ? node.name.slice(0, -4) : node.name;
          
          return (
            <div 
              key={node.name} 
              className={`file ${hasAccess ? 'file-clickable' : ''}`}
              onClick={hasAccess ? () => onSelectFile(filePath) : undefined}
              style={{ cursor: hasAccess ? 'pointer' : 'default' }}
            >
              <span className="file-name">{displayName}</span>
              <div className="file-actions">
                <FilePreviewButton file={node} currentPath={currentPath} />
                {isAdmin && (
                  <DeleteButton 
                    file={node} 
                    currentPath={currentPath} 
                    onDelete={onDelete} 
                  />
                )}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}

export default function SelecionarPdf() {
  const [fileTree, setFileTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [processOwners, setProcessOwners] = useState({}); 
  const navigate = useNavigate();
  const { username } = useContext(UserContext);

  // Verifica se é SuperAdmin
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  useEffect(() => {
    // Busca a árvore de ficheiros
    fetch("http://192.168.1.219:8080/files/list-files-tree")
      .then(res => res.json())
      .then(setFileTree)
      .catch(() => setFileTree([]));

    // Busca os donos dos processos
    fetch("http://192.168.1.219:8080/files/process-owners")
      .then(res => res.json())
      .then(setProcessOwners)
      .catch(() => setProcessOwners({}));
  }, []);

  // Função para recarregar a árvore de ficheiros após eliminação
  const reloadFileTree = () => {
    fetch("http://192.168.1.219:8080/files/list-files-tree")
      .then(res => res.json())
      .then(setFileTree)
      .catch(() => setFileTree([]));
  };

  const handleSelectFile = (filePath) => {
    // Substitui espaços por '-', barras por '__'
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  // Filtra a árvore conforme o termo de busca
  const filteredTree = filterTree(fileTree, searchTerm);

  return (
    <div className="file-container">
      <div className="header">
        <img src={Logo} alt="Logo" className="logo" />
        <h2 className="title">Magna ISO90001</h2>
      </div>
      <input
        type="text"
        placeholder="Encontrar arquivo ou pasta..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <div className="file-panel">
       <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="panel-title">Índice</div>
        {isAdmin && (
          <div className="admin-buttons" style={{ display: 'flex', gap: '10px' }}>
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
          onDelete={reloadFileTree}
        />
      </div>
    </div>
  );
};
