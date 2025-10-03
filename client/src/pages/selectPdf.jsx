import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import FilePreviewButton from "../components/Buttons/pdfPreviewButton";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import AIAssistant from "../components/AIAssistant/AIAssistant";
import Logo from "../logo.svg"
import Ver from "../icons/ver.ico"
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
    // TODOS os users podem aceder e ver os ficheiros
    // As permissões de edição são controladas separadamente no canEdit
    return true;
  };

  return (
    <div className="folder-structure">
      {sortedNodes.map(node => {
        if (node.type === "folder") {
          // Para pastas de primeiro nível, mostra o dono se existir
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          const isOwnerFolder = isTopLevel && folderOwner && folderOwner.split(',').map(nome => nome.trim()).includes(currentUser);
          
          return (
            <div key={node.name} className={`folder ${isOwnerFolder ? 'owner-folder' : ''}`}>
              <div
                className={`folder-header ${expandedFolder === node.name ? 'active' : ''}`}
                onClick={() => toggleFolder(node.name)}
              >
                <span className="folder-name">
                  {node.name}
                </span>
                <div className="folder-actions" style={{ display: 'flex', alignItems: 'center' }}>
                  {canAccessProcess([...currentPath, node.name].join("/")) && currentPath.length === 0 && (isAdmin || (folderOwner && folderOwner.split(',').map(nome => nome.trim()).includes(currentUser))) ? (
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
          
          // Verifica se o usuário pode deletar o arquivo
          const processOwnerString = processOwners[currentPath[0]];
          const isProcessOwner = processOwnerString && processOwnerString.split(',').map(nome => nome.trim()).includes(currentUser);
          const canDelete = isAdmin || isProcessOwner;
          
          return (
            <div 
              key={node.name} 
              className={`file ${hasAccess ? 'file-clickable' : ''}`}
              onClick={hasAccess ? () => onSelectFile(filePath) : undefined}
              style={{ cursor: hasAccess ? 'pointer' : 'default' }}
            >
              <span className="file-name">{displayName}</span>
              <div className="file-actions">
                {/* <button style={{ title:'Ver'}}><img src={Ver} alt="Ver" style={{ width: '100%', height: '35px' }} /></button> */}
                <FilePreviewButton file={node} currentPath={currentPath} />
                {canDelete && (
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
  const { username, logout } = useContext(UserContext);

  // Verifica se é SuperAdmin
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  // Função para fazer logout
  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      await logout();
      navigate("/", { replace: true });
    }
  };

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
    // Substituir espaços por '-', barras por '__'
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    
    // Determinar processo a partir do caminho do ficheiro
    const pathParts = filePath.split('/');
    const processName = pathParts[0]; // Assume que primeiro nível é o processo
    
    // Função utilitária para verificar se um usuário está na lista de donos do processo
    const isUserProcessOwner = (processOwnerString, username) => {
      if (!processOwnerString || !username) return false;
      const donosArray = processOwnerString.split(',').map(nome => nome.trim()).filter(nome => nome);
      return donosArray.includes(username);
    };
    
    // Verificar se user pode editar este processo
    const processOwner = processOwners[processName];
    const canEdit = isAdmin || isUserProcessOwner(processOwner, username);
    
    navigate(`/file/${formattedPath}`, { 
      state: { 
        originalFilename: filePath,
        canEdit: canEdit,
        isSuperAdmin: isAdmin
      } 
    });
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {username && (
            <span style={{ fontSize: '14px', color: '#666' }}>
              Olá, {username}
            </span>
          )}
          {isAdmin && (
            <div className="admin-buttons" style={{ display: 'flex', gap: '10px' }}>
              <AddUserButton />
              <AddProcessButton />
            </div>
          )}
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Sair
          </button>
        </div>
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

      {/* AI Assistant */}
      <AIAssistant 
        fileTree={filteredTree}
        searchTerm={searchTerm}
        username={username}
        isAdmin={isAdmin}
        processOwners={processOwners}
        onSuggestion={(suggestion) => {
          console.log('AI Suggestion:', suggestion);
        }}
      />
    </div>
  );
};
