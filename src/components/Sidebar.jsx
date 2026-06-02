import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { fixEncoding } from "../utils/fixEncoding";

export default function Sidebar({ onSelectFile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useContext(UserContext);
  const isAdmin = username === "superadmin" || username === "SuperAdmin";
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  const [favorites, setFavorites] = useState([]);
  const [resourcesFiles, setResourcesFiles] = useState([]);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    if (!username) return;
    fetch(`${process.env.REACT_APP_API_URL}/users/favorites/${username}`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.favorites || []);
        setFavorites(arr.map(fav => typeof fav === 'string'
          ? { path: fav, name: fixEncoding(fav.split('/').pop().replace('.pdf', '')) }
          : { path: fav.path || fav.filePath, name: fixEncoding(fav.name || fav.fileName || (fav.path || fav.filePath || '').split('/').pop().replace('.pdf', '')) }
        ));
      }).catch(() => setFavorites([]));
  }, [username]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/files/list-files-tree`)
      .then(r => r.json())
      .then(data => {
        const rf = data.find(n => n.name.includes("PROCESSO 6") || n.name.toLowerCase().includes("gestão de recursos humanos"));
        if (rf?.children) setResourcesFiles(rf.children.filter(c => c.type === "file").map(f => ({
          name: fixEncoding(f.name.endsWith('.pdf') ? f.name.slice(0, -4) : f.name),
          path: `${rf.name}/${f.name}`,
        })));
      }).catch(() => {});
  }, []);

  const removeFavorite = async (filePath) => {
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, action: 'remove' })
      });
      if (r.ok) setFavorites(prev => prev.filter(f => f.path !== filePath));
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-badge">C</div>
          <div>
            <div className="logo-text">Magna ISO9001</div>
            <div className="logo-sub">Cooperativa Comenius</div>
          </div>
        </div>

        <div className="sidebar-section">Principal</div>
        <div className={`nav-item ${isActive("/file") ? "active" : ""}`} onClick={() => navigate("/file")}>
          <span style={{ fontSize: 16, color: "var(--gold)" }}>📊</span> Dashboard
        </div>
        <div className={`nav-item ${isActive("/indice") ? "active" : ""}`} onClick={() => navigate("/indice")}>
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
                      <span className="favorites-dropdown-name" onClick={() => { onSelectFile(file.path); setShowResourcesDropdown(false); }}>📄 {file.name}</span>
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
                      <span className="favorites-dropdown-name" onClick={() => { onSelectFile(fav.path); setShowFavoritesDropdown(false); }}>📄 {fav.name}</span>
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
    </>
  );
}
