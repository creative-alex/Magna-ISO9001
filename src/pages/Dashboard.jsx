import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { FavoritesContext } from "../context/favoritesContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderStructure from "../components/FolderStructure";
import { filterTree } from "../utils/filterTree";
import { FaFile, FaCheck, FaStar } from "react-icons/fa6";
import AIAssistant from "../components/AIAssistant/AIAssistant";

export default function Dashboard() {
  const navigate = useNavigate();
  const { username, userRole } = useContext(UserContext);
  const { favorites, toggleFavorite, isFavorite } = useContext(FavoritesContext);
  const isAdmin = userRole === "SuperAdmin";
  const gold = "#C8932F";

  const [processOwners, setProcessOwners] = useState({});
  const [fileTree, setFileTree] = useState([]);
  const [totalUsers, setTotalUsers] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const reloadFileTree = () =>
    fetch(`${process.env.REACT_APP_API_URL}/files/list-files-tree`)
      .then(r => r.json()).then(setFileTree).catch(() => {});

  useEffect(() => {
    reloadFileTree();
    fetch(`${process.env.REACT_APP_API_URL}/files/process-owners`)
      .then(r => r.json()).then(setProcessOwners).catch(() => {});
    fetch(`${process.env.REACT_APP_API_URL}/users/getAllUsers`)
      .then(r => r.json()).then(data => setTotalUsers(Array.isArray(data) ? data.length : data.users?.length ?? null)).catch(() => {});
  }, []);

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    const processName = filePath.split('/')[0];
    const ownerStr = processOwners[processName];
    const canEdit = isAdmin || (ownerStr && ownerStr.split(',').map(n => n.trim()).includes(username));
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath, canEdit, isSuperAdmin: isAdmin } });
  };

  const totalProcessos = Object.keys(processOwners).length;
  const totalProcedimentos = fileTree.reduce((acc, node) =>
    acc + (node.type === "folder" && node.children ? node.children.filter(c => c.type === "file").length : 0), 0);

  const visibleTree = activeTab === "meus"
    ? fileTree.filter(node => {
        const owner = processOwners[node.name];
        return owner && owner.split(',').map(n => n.trim()).includes(username);
      })
    : fileTree;
  const filteredTree = filterTree(visibleTree, searchTerm);

  const kpis = [
    { label: "Processos", value: totalProcessos, sub: "no sistema", bar: 100 },
    { label: "Procedimentos", value: totalProcedimentos, sub: "documentados", bar: Math.min(100, totalProcedimentos * 3) },
    { label: "Não conformidades", value: 0, sub: "abertas", bar: 0, barColor: "#ef4444" },
    { label: "Colaboradores", value: totalUsers ?? "—", sub: "com acesso", noBar: true },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="📊" title="Dashboard" searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
            {kpis.map((kpi, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: "#111827" }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{kpi.sub}</div>
                {!kpi.noBar && (
                  <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginTop: 8 }}>
                    <div style={{ height: 3, width: `${kpi.bar}%`, background: kpi.barColor || gold, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mapa + Painel lateral */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

            {/* Mapa de processos */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Mapa de processos</span>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", padding: "0 18px" }}>
                {[{ label: "Todos", key: "todos" }, { label: "Os meus", key: "meus" }].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <div key={tab.key} onClick={() => setActiveTab(tab.key)}
                      style={{ fontSize: 12, padding: "9px 12px", color: isActive ? gold : "#6b7280", borderBottom: isActive ? `2px solid ${gold}` : "2px solid transparent", cursor: "pointer", marginBottom: -1, fontWeight: isActive ? 600 : 400 }}>
                      {tab.label}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "10px 18px" }}>
                {filteredTree.length === 0 ? (
                  <div style={{ padding: "24px 0", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                    {activeTab === "meus" ? "Não é responsável por nenhum processo" : "A carregar processos..."}
                  </div>
                ) : (
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
                )}
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
                  <div style={{ fontSize: 30, marginBottom: 8, display: "flex", justifyContent: "center" }}>
                    <FaCheck style={{ color: "#22c55e" }} />
                  </div>
                  Sem não conformidades abertas
                </div>
              </div>

              {/* Favoritos */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Favoritos</span>
                  {favorites.length > 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>{favorites.length}</span>}
                </div>
                <div style={{ padding: favorites.length === 0 ? "20px 18px" : "4px 18px" }}>
                  {favorites.length === 0 ? (
                    <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6, display: "flex", justifyContent: "center" }}>
                        <FaStar style={{ color: "#d1d5db" }} />
                      </div>
                      Sem favoritos guardados
                    </div>
                  ) : favorites.map((fav, i) => (
                    <div key={fav.path} onClick={() => handleSelectFile(fav.path)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < favorites.length - 1 ? "1px solid #f9fafb" : "none", cursor: "pointer", color: "#374151" }}
                      onMouseEnter={e => e.currentTarget.style.color = gold}
                      onMouseLeave={e => e.currentTarget.style.color = "#374151"}>
                      <FaFile style={{ fontSize: 12, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.name}</span>
                      <span style={{ fontSize: 11, color: "#d1d5db" }}>›</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AIAssistant fileTree={filteredTree} searchTerm={searchTerm} username={username} isAdmin={isAdmin} isSuperAdmin={isAdmin} processOwners={processOwners} onSuggestion={() => {}} />
    </div>
  );
}
