import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import AddUserButton from "../components/Buttons/addUserButton";
import AddProcessButton from "../components/Buttons/addProcessButton";
import AIAssistant from "../components/AIAssistant/AIAssistant";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderStructure from "../components/FolderStructure";
import { filterTree } from "../utils/filterTree";
import "../index.css";

export default function SelecionarPdf() {
  const [fileTree, setFileTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [processOwners, setProcessOwners] = useState({});
  const [favorites, setFavorites] = useState([]);

  const navigate = useNavigate();
  const { username } = useContext(UserContext);
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/files/list-files-tree`)
      .then(r => r.json()).then(setFileTree).catch(() => setFileTree([]));
    fetch(`${process.env.REACT_APP_API_URL}/files/process-owners`)
      .then(r => r.json()).then(setProcessOwners).catch(() => setProcessOwners({}));
  }, []);

  useEffect(() => {
    if (!username) return;
    fetch(`${process.env.REACT_APP_API_URL}/users/favorites/${username}`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.favorites || []);
        setFavorites(arr.map(fav => typeof fav === 'string'
          ? { path: fav, name: fav.split('/').pop().replace('.pdf', '') }
          : { path: fav.path || fav.filePath, name: fav.name || fav.fileName || (fav.path || fav.filePath || '').split('/').pop().replace('.pdf', '') }
        ));
      }).catch(() => setFavorites([]));
  }, [username]);

  const toggleFavorite = async (filePath, fileName) => {
    const exists = favorites.find(f => f.path === filePath);
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filePath, fileName, action: exists ? 'remove' : 'add' })
      });
      if (r.ok) setFavorites(prev => exists ? prev.filter(f => f.path !== filePath) : [...prev, { path: filePath, name: fileName }]);
    } catch (e) { console.error(e); }
  };

  const reloadFileTree = () =>
    fetch(`${process.env.REACT_APP_API_URL}/files/list-files-tree`).then(r => r.json()).then(setFileTree).catch(() => {});

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    const processName = filePath.split('/')[0];
    const ownerStr = processOwners[processName];
    const canEdit = isAdmin || (ownerStr && ownerStr.split(',').map(n => n.trim()).includes(username));
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath, canEdit, isSuperAdmin: isAdmin } });
  };

  const filteredTree = filterTree(fileTree, searchTerm);
  const isFavorite = (filePath) => favorites.some(f => f.path === filePath);

  const adminButtons = isAdmin
    ? <><AddUserButton /><AddProcessButton /></>
    : null;

  return (
    <div className="app-shell">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="main-area">
        <Topbar
          icon="🗂"
          title="Índice de documentos"
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          adminButtons={adminButtons}
        />

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
      </div>

      <AIAssistant fileTree={filteredTree} searchTerm={searchTerm} username={username} isAdmin={isAdmin} isSuperAdmin={isAdmin} processOwners={processOwners} onSuggestion={() => {}} />
    </div>
  );
}
