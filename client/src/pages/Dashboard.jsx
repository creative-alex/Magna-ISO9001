import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { FavoritesContext } from "../context/favoritesContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { fixEncoding } from "../utils/fixEncoding";
import { filterTree } from "../utils/filterTree";
import DeleteButton from "../components/Buttons/delete";
import CreateTableButton from "../components/Buttons/createTableButton";
import PdfPreviewButton from "../components/Buttons/pdfPreviewButton";
import { FaFile, FaCheck, FaStar, FaRegStar } from "react-icons/fa6";
import AIAssistant from "../components/AIAssistant/AIAssistant";
import { apiFetch } from "../utils/apiFetch";

export default function Dashboard() {
  const navigate = useNavigate();
  const { username, nivelAcesso } = useContext(UserContext);
  const { favorites, toggleFavorite, isFavorite } = useContext(FavoritesContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const gold = "#C8932F";

  const [processOwners, setProcessOwners] = useState({});
  const [fileTree, setFileTree] = useState([]);
  const [totalUsers, setTotalUsers] = useState(null);
  const [expandedProcess, setExpandedProcess] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const reloadFileTree = () =>
    apiFetch(`/files/list-files-tree`)
      .then(r => r.json()).then(setFileTree).catch(() => {});

  useEffect(() => {
    reloadFileTree();
    apiFetch(`/files/process-owners`)
      .then(r => r.json()).then(setProcessOwners).catch(() => {});
    apiFetch(`/users/getAllUsers`)
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

  const filteredTree = filterTree(fileTree, searchTerm);
  const filteredNames = new Set(filteredTree.map(n => n.name));

  const todosProcessos = Object.entries(processOwners).map(([nome, dono]) => ({
    nome, dono: dono || "Sem dono",
    num: nome.match(/\d+/)?.[0] ?? "?",
    estado: dono ? "ok" : "warn",
  })).sort((a, b) => parseInt(a.num) - parseInt(b.num));

  const processos = todosProcessos.filter(p => {
    if (activeTab === "meus" && !p.dono.split(',').map(n => n.trim()).includes(username)) return false;
    if (searchTerm && !filteredNames.has(p.nome)) return false;
    return true;
  });

  const dotColor = { ok: "#22c55e", warn: gold, alert: "#ef4444" };

  const ICON_SIZE = 13;
  const iconBtnBase = "bg-transparent border-0 p-1 cursor-pointer flex items-center justify-center rounded flex-shrink-0";
  const favoriteBtnClass = `${iconBtnBase} text-[#C8932F] hover:bg-[#FFF7E6]`;
  const previewBtnClass = `${iconBtnBase} text-[#C8932F] hover:bg-[#FFF7E6]`;
  const createBtnClass = `${iconBtnBase} text-[#7A5010] hover:bg-[#F0E2C4]`;
  const deleteBtnClass = `${iconBtnBase} text-red-500 hover:bg-red-50`;

  const getFilesForProcess = (processName) => {
    const folder = filteredTree.find(n => n.name === processName);
    if (!folder?.children) return [];
    return folder.children.filter(c => c.type === "file");
  };

  const kpis = [
    { label: "Processos", value: totalProcessos, sub: "no sistema", bar: 100 },
    { label: "Procedimentos", value: totalProcedimentos, sub: "documentados", bar: Math.min(100, totalProcedimentos * 3) },
    { label: "Não conformidades", value: 0, sub: "abertas", bar: 0, barColor: "#ef4444" },
    { label: "Colaboradores", value: totalUsers ?? " - ", sub: "com acesso", noBar: true },
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
                    <div key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedProcess(null); }}
                      style={{ fontSize: 12, padding: "9px 12px", color: isActive ? gold : "#6b7280", borderBottom: isActive ? `2px solid ${gold}` : "2px solid transparent", cursor: "pointer", marginBottom: -1, fontWeight: isActive ? 600 : 400 }}>
                      {tab.label}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "4px 18px" }}>
                {processos.length === 0 ? (
                  <div style={{ padding: "24px 0", color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                    {activeTab === "meus" ? "Não é responsável por nenhum processo" : "A carregar processos..."}
                  </div>
                ) : processos.map((p, i) => {
                  const isExpanded = expandedProcess === p.nome;
                  const files = isExpanded ? getFilesForProcess(p.nome) : [];
                  const canManage = isAdmin || p.dono.split(',').map(n => n.trim()).includes(username);
                  return (
                    <div key={i} style={{ borderBottom: i < processos.length - 1 ? "1px solid #f9fafb" : "none" }}>
                      <div onClick={() => setExpandedProcess(isExpanded ? null : p.nome)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", cursor: "pointer" }}>
                        <span style={{ fontSize: 10, color: "#9ca3af", width: 22, flexShrink: 0, fontWeight: 600 }}>P{p.num}</span>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor[p.estado], flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.nome.replace(/^PROCESSO \d+:\s*/i, "")}
                        </span>
                        <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{p.dono}</span>
                        {canManage && <CreateTableButton folderName={p.nome} currentPath={[]} size={ICON_SIZE} className={createBtnClass} />}
                        {isAdmin && <DeleteButton file={{ name: p.nome }} currentPath={[]} onDelete={reloadFileTree} isFolder size={ICON_SIZE} className={deleteBtnClass} />}
                        <span style={{ color: "#d1d5db", fontSize: 12, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>›</span>
                      </div>
                      {isExpanded && (
                        <div style={{ paddingLeft: 32, paddingBottom: 6 }}>
                          {files.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>Sem procedimentos</div>
                          ) : files.map((f, j) => {
                            const displayName = fixEncoding(f.name.endsWith('.pdf') ? f.name.slice(0, -4) : f.name);
                            const filePath = `${p.nome}/${f.name}`;
                            const isFav = isFavorite(filePath);
                            return (
                              <div key={j} onClick={() => handleSelectFile(filePath)}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", borderBottom: j < files.length - 1 ? "1px solid #f9fafb" : "none", color: "#374151" }}
                                onMouseEnter={e => e.currentTarget.style.color = gold}
                                onMouseLeave={e => e.currentTarget.style.color = "#374151"}>
                                <FaFile style={{ fontSize: 12, color: "inherit", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: "inherit", flex: 1 }}>{displayName}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(filePath, displayName); }}
                                  className={favoriteBtnClass}
                                  title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                >
                                  {isFav ? <FaStar size={ICON_SIZE} /> : <FaRegStar size={ICON_SIZE} />}
                                </button>
                                <PdfPreviewButton file={f} currentPath={[p.nome]} size={ICON_SIZE} className={previewBtnClass} />
                                {canManage && <DeleteButton file={f} currentPath={[p.nome]} onDelete={reloadFileTree} size={ICON_SIZE} className={deleteBtnClass} />}
                                <span style={{ fontSize: 11, color: "#d1d5db", flexShrink: 0 }}>›</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
