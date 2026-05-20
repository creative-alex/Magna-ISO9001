// rebuild: v4 — dashboard integrado
import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import FilePreviewButton from "../components/Buttons/pdfPreviewButton";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import AIAssistant from "../components/AIAssistant/AIAssistant";
import "../index.css";

// ─── FILTRO DE ÁRVORE ───────────────────────────────────────────────────────
function filterTree(nodes, searchTerm) {
  if (!searchTerm) return nodes;
  return nodes.map(node => {
    if (node.type === "folder") {
      const filteredChildren = filterTree(node.children || [], searchTerm);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase()))
        return { ...node, children: filteredChildren };
      return null;
    }
    return node.name.toLowerCase().includes(searchTerm.toLowerCase()) ? node : null;
  }).filter(Boolean);
}

// ─── ESTRUTURA DE PASTAS ─────────────────────────────────────────────────────
function FolderStructure({ nodes, onSelectFile, currentPath = [], processOwners, currentUser, isAdmin, onDelete, onToggleFavorite, isFavorite }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const sortNodes = (nodes) => {
    const extractNumber = (name) => {
      let m = name.match(/^(\d+)/); if (m) return m[1];
      m = name.match(/procedimento\s+(\d+)/i); if (m) return m[1];
      m = name.match(/(\d+)/); if (m) return m[1];
      return 'other';
    };
    const groups = new Map();
    nodes.filter(n => n.type === "file").forEach(f => {
      const n = extractNumber(f.name);
      if (!groups.has(n)) groups.set(n, { files: [], folders: [] });
      groups.get(n).files.push(f);
    });
    nodes.filter(n => n.type === "folder").forEach(f => {
      const n = extractNumber(f.name);
      if (!groups.has(n)) groups.set(n, { files: [], folders: [] });
      groups.get(n).folders.push(f);
    });
    const sorted = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'other') return 1; if (b[0] === 'other') return -1;
      return parseInt(a[0]) - parseInt(b[0]);
    });
    const result = [];
    sorted.forEach(([, g]) => {
      g.files.sort((a, b) => a.name.localeCompare(b.name)); result.push(...g.files);
      g.folders.sort((a, b) => a.name.localeCompare(b.name)); result.push(...g.folders);
    });
    return result;
  };

  return (
    <div className="folder-structure">
      {sortNodes(nodes).map(node => {
        if (node.type === "folder") {
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          const isOwnerFolder = isTopLevel && folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser);
          return (
            <div key={node.name} className={`folder ${isOwnerFolder ? 'owner-folder' : ''}`}>
              <div className={`folder-header ${expandedFolder === node.name ? 'active' : ''}`} onClick={() => setExpandedFolder(expandedFolder === node.name ? null : node.name)}>
                <span className="folder-name">{node.name}</span>
                <div className="folder-actions">
                  {currentPath.length === 0 && (isAdmin || (folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser))) &&
                    <CreateTableButton folderName={node.name} currentPath={currentPath} />}
                </div>
              </div>
              {expandedFolder === node.name && (
                <div className="folder-content">
                  <FolderStructure nodes={node.children || []} onSelectFile={onSelectFile} currentPath={[...currentPath, node.name]} processOwners={processOwners} currentUser={currentUser} isAdmin={isAdmin} onDelete={onDelete} onToggleFavorite={onToggleFavorite} isFavorite={isFavorite} />
                </div>
              )}
            </div>
          );
        }
        const filePath = [...currentPath, node.name].join("/");
        const isClickableFile = currentPath.length <= 1;
        const displayName = node.name.endsWith('.pdf') ? node.name.slice(0, -4) : node.name;
        const isFav = isFavorite && isFavorite(filePath);
        return (
          <div key={node.name} className={`file ${isClickableFile ? 'file-clickable' : ''}`} style={{ cursor: isClickableFile ? 'pointer' : 'default' }}>
            <span className="file-name" onClick={isClickableFile ? () => onSelectFile(filePath) : undefined}>{displayName}</span>
            <div className="file-actions">
              {isClickableFile && onToggleFavorite && (
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(filePath, displayName); }} className="favorite-button" title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>{isFav ? '⭐' : '☆'}</button>
              )}
              <FilePreviewButton file={node} currentPath={currentPath} />
              {isAdmin && <DeleteButton file={node} currentPath={currentPath} onDelete={onDelete} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ processOwners, fileTree, onNavigate, username, isAdmin }) {
  const gold = "#C8932F";
  const totalProcessos = Object.keys(processOwners).length;
  const totalProcedimentos = fileTree.reduce((acc, node) =>
    acc + (node.type === "folder" && node.children ? node.children.filter(c => c.type === "file").length : 0), 0);

  const processos = Object.entries(processOwners).map(([nome, dono]) => ({
    nome, dono: dono || "Sem dono",
    num: nome.match(/\d+/)?.[0] ?? "?",
    estado: dono ? "ok" : "warn",
  })).sort((a, b) => parseInt(a.num) - parseInt(b.num));

  const dotColor = { ok: "#22c55e", warn: gold, alert: "#ef4444" };

  const kpis = [
    { label: "Processos", value: totalProcessos, sub: "no sistema", bar: 100 },
    { label: "Procedimentos", value: totalProcedimentos, sub: "documentados", bar: Math.min(100, totalProcedimentos * 3) },
    { label: "Não conformidades", value: 0, sub: "abertas", bar: 0, barColor: "#ef4444", accent: false },
    { label: "Colaboradores", value: "—", sub: "com acesso", bar: 0 },
  ];

  const acessoRapido = [
    { icon: "🗂", label: "Índice de documentos", action: () => onNavigate("indice") },
    { icon: "⚠️", label: "Registar não conformidade", action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLSePnbZJUGv7J_YW0MKXn-E61t_naMr25TO2nk_GRDdR8Z13MQ/viewform', '_blank') },
    { icon: "🔄", label: "Tratar não conformidade", action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLScrMQcU-waZqVtapeChdN3cQOl8SRQtZkWZEUJNvAYvvYLIJw/viewform', '_blank') },
    ...(isAdmin ? [
      { icon: "📋", label: "Novo processo", action: () => onNavigate("novo-processo") },
      { icon: "👤", label: "Novo utilizador", action: () => onNavigate("create-user") },
    ] : [])
  ];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: kpi.accent ? gold : "#111827" }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{kpi.sub}</div>
            <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: 3, width: `${kpi.bar}%`, background: kpi.barColor || gold, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Mapa + Painel lateral */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

        {/* Mapa de processos */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Mapa de processos</span>
            <span style={{ fontSize: 12, color: gold, cursor: "pointer" }} onClick={() => onNavigate("indice")}>ver índice →</span>
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", padding: "0 18px" }}>
            {["Todos", "Os meus"].map((tab, i) => (
              <div key={i} style={{ fontSize: 12, padding: "9px 12px", color: i === 0 ? gold : "#6b7280", borderBottom: i === 0 ? `2px solid ${gold}` : "2px solid transparent", cursor: "pointer", marginBottom: -1, fontWeight: i === 0 ? 600 : 400 }}>{tab}</div>
            ))}
          </div>
          <div style={{ padding: "4px 18px" }}>
            {processos.length === 0 ? (
              <div style={{ padding: "24px 0", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>A carregar processos...</div>
            ) : processos.map((p, i) => (
              <div key={i} onClick={() => onNavigate("indice")}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < processos.length - 1 ? "1px solid #f9fafb" : "none", cursor: "pointer" }}>
                <span style={{ fontSize: 10, color: "#9ca3af", width: 22, flexShrink: 0, fontWeight: 600 }}>P{p.num}</span>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor[p.estado], flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.nome.replace(/^PROCESSO \d+:\s*/i, "")}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{p.dono}</span>
                <span style={{ color: "#d1d5db", fontSize: 13 }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Não conformidades */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Não conformidades</span>
              <span style={{ fontSize: 12, color: gold, cursor: "pointer" }}
                onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSePnbZJUGv7J_YW0MKXn-E61t_naMr25TO2nk_GRDdR8Z13MQ/viewform', '_blank')}>
                registar →
              </span>
            </div>
            <div style={{ padding: "20px 18px", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
              Sem não conformidades abertas
            </div>
          </div>

          {/* Acesso rápido */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Acesso rápido</span>
            </div>
            <div style={{ padding: "6px 18px" }}>
              {acessoRapido.map((item, i) => (
                <div key={i} onClick={item.action}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < acessoRapido.length - 1 ? "1px solid #f9fafb" : "none", cursor: "pointer", fontSize: 13, color: "#374151", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = gold}
                  onMouseLeave={e => e.currentTarget.style.color = "#374151"}>
                  <span>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ color: "#d1d5db" }}>›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SelecionarPdf() {
  const [fileTree, setFileTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [processOwners, setProcessOwners] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [resourcesFiles, setResourcesFiles] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const navigate = useNavigate();
  const { username, logout } = useContext(UserContext);
  const isAdmin = username === "superadmin" || username === "SuperAdmin";
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  const handleNavigate = (page) => {
    if (page === "novo-processo") { navigate('/novo-processo'); return; }
    if (page === "create-user") { navigate('/create-user'); return; }
    setActivePage(page);
  };

  useEffect(() => {
    if (username) {
      fetch(`https://api-iso-9001.onrender.com/users/favorites/${username}`)
        .then(r => r.json())
        .then(data => {
          const arr = Array.isArray(data) ? data : (data.favorites || []);
          setFavorites(arr.map(fav => typeof fav === 'string'
            ? { path: fav, name: fav.split('/').pop().replace('.pdf', '') }
            : { path: fav.path || fav.filePath, name: fav.name || fav.fileName || (fav.path || fav.filePath || '').split('/').pop().replace('.pdf', '') }
          ));
        }).catch(() => setFavorites([]));
    }
  }, [username]);

  const toggleFavorite = async (filePath, fileName) => {
    const exists = favorites.find(f => f.path === filePath);
    try {
      const r = await fetch("https://api-iso-9001.onrender.com/users/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, fileName, action: exists ? 'remove' : 'add' })
      });
      if (r.ok) setFavorites(prev => exists ? prev.filter(f => f.path !== filePath) : [...prev, { path: filePath, name: fileName }]);
    } catch (e) { console.error(e); }
  };

  const removeFavorite = async (filePath) => {
    try {
      const r = await fetch("https://api-iso-9001.onrender.com/users/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, action: 'remove' })
      });
      if (r.ok) setFavorites(prev => prev.filter(f => f.path !== filePath));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetch("https://api-iso-9001.onrender.com/files/list-files-tree")
      .then(r => r.json()).then(data => {
        setFileTree(data);
        const rf = data.find(n => n.name.includes("PROCESSO 6") || n.name.toLowerCase().includes("gestão de recursos humanos"));
        if (rf?.children) setResourcesFiles(rf.children.filter(c => c.type === "file").map(f => ({ name: f.name.endsWith('.pdf') ? f.name.slice(0, -4) : f.name, path: `${rf.name}/${f.name}` })));
      }).catch(() => setFileTree([]));
    fetch("https://api-iso-9001.onrender.com/files/process-owners")
      .then(r => r.json()).then(setProcessOwners).catch(() => setProcessOwners({}));
  }, []);

  const reloadFileTree = () => fetch("https://api-iso-9001.onrender.com/files/list-files-tree").then(r => r.json()).then(setFileTree).catch(() => {});

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    const processName = filePath.split('/')[0];
    const ownerStr = processOwners[processName];
    const canEdit = isAdmin || (ownerStr && ownerStr.split(',').map(n => n.trim()).includes(username));
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath, canEdit, isSuperAdmin: isAdmin } });
  };

  const filteredTree = filterTree(fileTree, searchTerm);
  const isFavorite = (filePath) => favorites.some(f => f.path === filePath);

  // Labels do topbar por página
  const pageLabels = { dashboard: "Dashboard", indice: "Índice de documentos" };

  return (
    <div className="app-shell">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-badge">C</div>
          <div>
            <div className="logo-text">Magna ISO9001</div>
            <div className="logo-sub">Cooperativa Comenius</div>
          </div>
        </div>

        <div className="sidebar-section">Principal</div>
        <div className={`nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => setActivePage("dashboard")}>
          <span style={{ fontSize: 16, color: "var(--gold)" }}>📊</span> Dashboard
        </div>
        <div className={`nav-item ${activePage === "indice" ? "active" : ""}`} onClick={() => setActivePage("indice")}>
          <span style={{ fontSize: 16, color: "var(--gold)" }}>🗂</span> Índice de documentos
        </div>

        {resourcesFiles.length > 0 && (
          <div className="nav-item" style={{ position: 'relative' }} onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}>
            <span style={{ fontSize: 16, color: "var(--gold)" }}>👥</span> Recursos Humanos
            <span className={`dropdown-arrow ${showResourcesDropdown ? 'open' : ''}`} style={{ marginLeft: 'auto', fontSize: 10 }}>▼</span>
            {showResourcesDropdown && (
              <>
                <div className="favorites-dropdown-overlay" onClick={(e) => { e.stopPropagation(); setShowResourcesDropdown(false); }} />
                <div className="favorites-dropdown-menu" style={{ top: '100%', left: 0, minWidth: 210 }}>
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
          <div className="nav-item" style={{ position: 'relative' }} onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}>
            <span style={{ fontSize: 16, color: "var(--gold)" }}>⭐</span> Favoritos ({favorites.length})
            <span className={`dropdown-arrow ${showFavoritesDropdown ? 'open' : ''}`} style={{ marginLeft: 'auto', fontSize: 10 }}>▼</span>
            {showFavoritesDropdown && (
              <>
                <div className="favorites-dropdown-overlay" onClick={(e) => { e.stopPropagation(); setShowFavoritesDropdown(false); }} />
                <div className="favorites-dropdown-menu" style={{ top: '100%', left: 0, minWidth: 210 }}>
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
          <span style={{ fontSize: 16, color: "var(--gold)" }}>⚠️</span> Registar Não Conformidade
        </div>
        <div className="nav-item" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScrMQcU-waZqVtapeChdN3cQOl8SRQtZkWZEUJNvAYvvYLIJw/viewform', '_blank')}>
          <span style={{ fontSize: 16, color: "var(--gold)" }}>🔄</span> Tratar Não Conformidade
        </div>

        {isAdmin && (
          <>
            <div className="sidebar-section">Administração</div>
            <div className="nav-item" onClick={() => navigate('/create-user')}>
              <span style={{ fontSize: 16, color: "var(--gold)" }}>👤</span> Novo Utilizador
            </div>
            <div className="nav-item" onClick={() => navigate('/novo-processo')}>
              <span style={{ fontSize: 16, color: "var(--gold)" }}>📋</span> Novo Processo
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
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--section-label)' }}>↗</span>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="main-area">

        {/* TOPBAR */}
        <div className="topbar">
          <div className="breadcrumb">
            <span style={{ fontSize: 14 }}>{activePage === "dashboard" ? "📊" : "🗂"}</span>
            <span className="sep">›</span>
            <span className="current">{pageLabels[activePage] || activePage}</span>
          </div>
          {activePage === "indice" && (
            <div className="topbar-search">
              <span style={{ position: 'absolute', left: 10, fontSize: 14, color: '#9ca3af' }}>🔍</span>
              <input type="text" placeholder="Pesquisar arquivos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
          )}
          {isAdmin && activePage === "indice" && (
            <div className="admin-buttons">
              <AddUserButton />
              <AddProcessButton />
            </div>
          )}
          <span className="topbar-user" style={{ marginLeft: activePage === "dashboard" ? "auto" : 0 }}>Olá, {username}</span>
          <button className="topbar-logout" onClick={() => setShowLogoutModal(true)}>Sair</button>
        </div>

        {/* CONTEÚDO — alterna entre Dashboard e Índice */}
        {activePage === "dashboard" ? (
          <Dashboard
            processOwners={processOwners}
            fileTree={fileTree}
            onNavigate={handleNavigate}
            username={username}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="page-content">
            <div className="file-panel">
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
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
        )}
      </div>

      {/* AI ASSISTANT */}
      <AIAssistant fileTree={filteredTree} searchTerm={searchTerm} username={username} isAdmin={isAdmin} isSuperAdmin={isAdmin} processOwners={processOwners} onSuggestion={() => {}} />

      {/* MODAL LOGOUT */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 28, minWidth: 300, maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👋</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600, color: '#111827' }}>Confirmar saída</h3>
            <p style={{ margin: '0 0 22px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>Tem a certeza que pretende terminar a sessão?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ padding: '9px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Cancelar</button>
              <button onClick={async () => { setShowLogoutModal(false); await logout(); navigate("/", { replace: true }); }} style={{ padding: '9px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
