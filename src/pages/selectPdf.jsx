import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import FilePreviewButton from "../components/Buttons/pdfPreviewButton";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import AIAssistant from "../components/AIAssistant/AIAssistant";
import Logo from "../logo.svg";
import "../index.css";

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
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) return node;
      return null;
    })
    .filter(Boolean);
}

function FolderStructure({ nodes, onSelectFile, currentPath = [], processOwners, currentUser, isAdmin, onDelete, onToggleFavorite, isFavorite }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const sortNodes = (nodes) => {
    const folders = nodes.filter(n => n.type === "folder");
    const files = nodes.filter(n => n.type === "file");
    const extractNumber = (name) => {
      let match = name.match(/^(\d+)/);
      if (match) return match[1];
      match = name.match(/procedimento\s+(\d+)/i);
      if (match) return match[1];
      match = name.match(/(\d+)/);
      if (match) return match[1];
      return 'other';
    };
    const groups = new Map();
    files.forEach(file => {
      const number = extractNumber(file.name);
      if (!groups.has(number)) groups.set(number, { files: [], folders: [] });
      groups.get(number).files.push(file);
    });
    folders.forEach(folder => {
      const number = extractNumber(folder.name);
      if (!groups.has(number)) groups.set(number, { files: [], folders: [] });
      groups.get(number).folders.push(folder);
    });
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'other') return 1;
      if (b[0] === 'other') return -1;
      return parseInt(a[0]) - parseInt(b[0]);
    });
    const result = [];
    sortedGroups.forEach(([, group]) => {
      group.files.sort((a, b) => a.name.localeCompare(b.name));
      result.push(...group.files);
      group.folders.sort((a, b) => a.name.localeCompare(b.name));
      result.push(...group.folders);
    });
    return result;
  };

  const sortedNodes = sortNodes(nodes);
  const toggleFolder = (folderName) => setExpandedFolder(expandedFolder === folderName ? null : folderName);

  return (
    <div className="folder-structure">
      {sortedNodes.map(node => {
        if (node.type === "folder") {
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          const isOwnerFolder = isTopLevel && folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser);
          return (
            <div key={node.name} className={`folder ${isOwnerFolder ? 'owner-folder' : ''}`}>
              <div
                className={`folder-header ${expandedFolder === node.name ? 'active' : ''}`}
                onClick={() => toggleFolder(node.name)}
              >
                <span className="folder-name">{node.name}</span>
                <div className="folder-actions">
                  {currentPath.length === 0 && (isAdmin || (folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser))) ? (
                    <CreateTableButton folderName={node.name} currentPath={currentPath} />
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
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={isFavorite}
                  />
                </div>
              )}
            </div>
          );
        } else {
          const filePath = [...currentPath, node.name].join("/");
          const isClickableFile = currentPath.length <= 1;
          const displayName = node.name.endsWith('.pdf') ? node.name.slice(0, -4) : node.name;
          const canDelete = isAdmin;
          const isFav = isFavorite && isFavorite(filePath);
          return (
            <div
              key={node.name}
              className={`file ${isClickableFile ? 'file-clickable' : ''}`}
              style={{ cursor: isClickableFile ? 'pointer' : 'default' }}
            >
              <span className="file-name" onClick={isClickableFile ? () => onSelectFile(filePath) : undefined}>
                {displayName}
              </span>
              <div className="file-actions">
                {isClickableFile && onToggleFavorite && (
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(filePath, displayName); }} className="favorite-button" title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                    {isFav ? '⭐' : '☆'}
                  </button>
                )}
                <FilePreviewButton file={node} currentPath={currentPath} />
                {canDelete && <DeleteButton file={node} currentPath={currentPath} onDelete={onDelete} />}
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [resourcesFiles, setResourcesFiles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { username, logout } = useContext(UserContext);
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  // Iniciais do utilizador para avatar
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  useEffect(() => {
    if (username) {
      fetch(`https://api-iso-9001.onrender.com/users/favorites/${username}`)
        .then(res => res.json())
        .then(data => {
          let favoritosArray = [];
          if (Array.isArray(data)) favoritosArray = data;
          else if (data.favorites && Array.isArray(data.favorites)) favoritosArray = data.favorites;
          const formattedFavorites = favoritosArray.map(fav => {
            if (typeof fav === 'string') return { path: fav, name: fav.split('/').pop().replace('.pdf', '') };
            if (fav.filePath && !fav.path) return { path: fav.filePath, name: fav.fileName || fav.filePath.split('/').pop().replace('.pdf', '') };
            return { path: fav.path || fav.filePath, name: fav.name || fav.fileName || (fav.path || fav.filePath).split('/').pop().replace('.pdf', '') };
          });
          setFavorites(formattedFavorites);
        })
        .catch(() => setFavorites([]));
    }
  }, [username]);

  const toggleFavorite = async (filePath, fileName) => {
    const exists = favorites.find(fav => fav.path === filePath);
    try {
      const response = await fetch("https://api-iso-9001.onrender.com/users/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, fileName, action: exists ? 'remove' : 'add' })
      });
      if (response.ok) {
        setFavorites(prev => exists ? prev.filter(fav => fav.path !== filePath) : [...prev, { path: filePath, name: fileName, addedAt: new Date().toISOString() }]);
      }
    } catch (error) { console.error('Erro ao atualizar favorito:', error); }
  };

  const isFavorite = (filePath) => favorites.some(fav => fav.path === filePath);

  const removeFavorite = async (filePath) => {
    try {
      const response = await fetch("https://api-iso-9001.onrender.com/users/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, action: 'remove' })
      });
      if (response.ok) setFavorites(prev => prev.filter(fav => fav.path !== filePath));
    } catch (error) { console.error('Erro ao remover favorito:', error); }
  };

  useEffect(() => {
    fetch("https://api-iso-9001.onrender.com/files/list-files-tree")
      .then(res => res.json())
      .then(data => {
        setFileTree(data);
        const resourcesFolder = data.find(node => node.name.includes("PROCESSO 6") || node.name.toLowerCase().includes("gestão de recursos humanos"));
        if (resourcesFolder && resourcesFolder.children) {
          const files = resourcesFolder.children.filter(child => child.type === "file").map(file => ({ name: file.name.endsWith('.pdf') ? file.name.slice(0, -4) : file.name, path: `${resourcesFolder.name}/${file.name}` }));
          setResourcesFiles(files);
        }
      })
      .catch(() => setFileTree([]));
    fetch("https://api-iso-9001.onrender.com/files/process-owners")
      .then(res => res.json())
      .then(setProcessOwners)
      .catch(() => setProcessOwners({}));
  }, []);

  const reloadFileTree = () => {
    fetch("https://api-iso-9001.onrender.com/files/list-files-tree")
      .then(res => res.json())
      .then(setFileTree)
      .catch(() => setFileTree([]));
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    const processName = filePath.split('/')[0];
    const isUserProcessOwner = (ownerStr, uname) => {
      if (!ownerStr || !uname) return false;
      return ownerStr.split(',').map(n => n.trim()).includes(uname);
    };
    const canEdit = isAdmin || isUserProcessOwner(processOwners[processName], username);
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath, canEdit, isSuperAdmin: isAdmin } });
  };

  const filteredTree = filterTree(fileTree, searchTerm);

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-badge">C</div>
          <div>
            <div className="logo-text">Magna ISO9001</div>
            <div className="logo-sub">Cooperativa Comenius</div>
          </div>
        </div>

        <div className="sidebar-section">Principal</div>
        <div className="nav-item active">
          <span style={{fontSize:17,color:'var(--gold)'}}>🗂</span> Índice de Documentos
        </div>
        {resourcesFiles.length > 0 && (
          <div className="nav-item" style={{position:'relative'}} onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}>
            <span style={{fontSize:17,color:'var(--gold)'}}>👥</span> Recursos Humanos
            <span className={`dropdown-arrow ${showResourcesDropdown ? 'open' : ''}`} style={{marginLeft:'auto',fontSize:10}}>▼</span>
            {showResourcesDropdown && (
              <>
                <div className="favorites-dropdown-overlay" onClick={(e) => { e.stopPropagation(); setShowResourcesDropdown(false); }} />
                <div className="favorites-dropdown-menu" style={{top:'100%',left:0,minWidth:200}}>
                  {resourcesFiles.map(file => (
                    <div key={file.path} className="favorites-dropdown-item">
                      <span className="favorites-dropdown-name" onClick={() => { handleSelectFile(file.path); setShowResourcesDropdown(false); }}>📄 {file.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {favorites.length > 0 && (
          <div className="nav-item" style={{position:'relative'}} onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}>
            <span style={{fontSize:17,color:'var(--gold)'}}>⭐</span> Favoritos ({favorites.length})
            <span className={`dropdown-arrow ${showFavoritesDropdown ? 'open' : ''}`} style={{marginLeft:'auto',fontSize:10}}>▼</span>
            {showFavoritesDropdown && (
              <>
                <div className="favorites-dropdown-overlay" onClick={(e) => { e.stopPropagation(); setShowFavoritesDropdown(false); }} />
                <div className="favorites-dropdown-menu" style={{top:'100%',left:0,minWidth:200}}>
                  {favorites.map(fav => (
                    <div key={fav.path} className="favorites-dropdown-item">
                      <span className="favorites-dropdown-name" onClick={() => { handleSelectFile(fav.path); setShowFavoritesDropdown(false); }}>📄 {fav.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFavorite(fav.path); }} className="favorites-dropdown-remove" title="Remover">×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="sidebar-section">Ações rápidas</div>
        <div className="nav-item" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSePnbZJUGv7J_YW0MKXn-E61t_naMr25TO2nk_GRDdR8Z13MQ/viewform', '_blank')}>
          <span style={{fontSize:17,color:'var(--gold)'}}>⚠️</span> Registar Não Conformidade
        </div>
        <div className="nav-item" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScrMQcU-waZqVtapeChdN3cQOl8SRQtZkWZEUJNvAYvvYLIJw/viewform', '_blank')}>
          <span style={{fontSize:17,color:'var(--gold)'}}>🔄</span> Tratar Não Conformidade
        </div>

        {isAdmin && (
          <>
            <div className="sidebar-section">Administração</div>
            <div className="nav-item" onClick={() => navigate('/create-user')}>
              <span style={{fontSize:17,color:'var(--gold)'}}>👤</span> Novo Utilizador
            </div>
            <div className="nav-item" onClick={() => navigate('/novo-processo')}>
              <span style={{fontSize:17,color:'var(--gold)'}}>📋</span> Novo Processo
            </div>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="user-pill" onClick={() => setShowLogoutModal(true)}>
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{username}</div>
              <div className="user-role">{isAdmin ? 'SuperAdmin' : 'Utilizador'}</div>
            </div>
            <span style={{marginLeft:'auto',fontSize:13,color:'var(--section-label)'}}>↗</span>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="main-area">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="breadcrumb">
            <span>🗂</span>
            <span className="sep">›</span>
            <span className="current">Índice de Documentos</span>
          </div>
          <div className="topbar-search">
            <span style={{position:'absolute',left:10,fontSize:15,color:'#9ca3af'}}>🔍</span>
            <input
              type="text"
              placeholder="Pesquisar arquivos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{paddingLeft:34}}
            />
          </div>
          {isAdmin && (
            <div className="admin-buttons">
              <AddUserButton />
              <AddProcessButton />
            </div>
          )}
          <span className="topbar-user">Olá, {username}</span>
          <button className="topbar-logout" onClick={() => setShowLogoutModal(true)}>Sair</button>
        </div>

        {/* CONTEÚDO */}
        <div className="page-content">
          <div className="file-panel">
            <div className="panel-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%'}}>
              <div className="panel-title">Índice</div>
            </div>
            <FolderStructure
              nodes={filteredTree}
              onSelectFile={handleSelectFile}
              processOwners={processOwners}
              currentUser={username}
              isAdmin={isAdmin}
              onDelete={reloadFileTree}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </div>
        </div>
      </div>

      {/* AI ASSISTANT */}
      <AIAssistant
        fileTree={filteredTree}
        searchTerm={searchTerm}
        username={username}
        isAdmin={isAdmin}
        isSuperAdmin={isAdmin}
        processOwners={processOwners}
        onSuggestion={(suggestion) => console.log('AI Suggestion:', suggestion)}
      />

      {/* MODAL LOGOUT */}
      {showLogoutModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000}}>
          <div style={{backgroundColor:'white',borderRadius:12,padding:28,minWidth:300,maxWidth:380,textAlign:'center',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{fontSize:44,marginBottom:14}}>👋</div>
            <h3 style={{margin:'0 0 8px',fontSize:17,fontWeight:600,color:'#111827'}}>Confirmar saída</h3>
            <p style={{margin:'0 0 22px',color:'#6b7280',fontSize:14,lineHeight:1.5}}>Tem a certeza que pretende terminar a sessão?</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={() => setShowLogoutModal(false)} style={{padding:'9px 20px',backgroundColor:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:500}}>Cancelar</button>
              <button onClick={async () => { setShowLogoutModal(false); await logout(); navigate("/", { replace: true }); }} style={{padding:'9px 20px',backgroundColor:'#dc2626',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:500}}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
