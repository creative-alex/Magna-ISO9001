import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../shared/context/userContext";
import { FavoritesContext } from "../../../shared/context/favoritesContext";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import { fixEncoding } from "../../../shared/utils/fixEncoding";
import { filterTree } from "../utils/filterTree";
import DeleteButton from "../components/DeleteButton";
import CreateTableButton from "../components/CreateTableButton";
import PdfPreviewButton from "../components/PdfPreviewButton";
import { FaFile, FaStar, FaRegStar } from "react-icons/fa6";
import AIAssistant from "../../aiAssistant/components/AIAssistant";
import KonamiWordle from "../components/KonamiWordle";
import { apiFetch } from "../../../shared/utils/apiFetch";
import { usePermissions } from "../../../shared/hooks/usePermissions";
import { GRAVIDADES } from "../../naoConformidade/estados";

export default function Dashboard() {
  const navigate = useNavigate();
  const { username } = useContext(UserContext);
  const { favorites, toggleFavorite, isFavorite } = useContext(FavoritesContext);
  const { isSuperAdmin } = usePermissions();
  const gold = "#C8932F";

  const [processOwners, setProcessOwners] = useState({});
  const [fileTree, setFileTree] = useState([]);
  const [expandedProcess, setExpandedProcess] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  // Indicadores de Não Conformidades (ver GET /nao-conformidades/indicadores) - uma única
  // leitura agregada no backend, nunca uma leitura por NC nem por ano aqui no frontend.
  const [ncIndicadores, setNcIndicadores] = useState(null);

  const reloadFileTree = () =>
    apiFetch(`/files/list-files-tree`)
      .then(r => r.json()).then(setFileTree).catch(() => {});

  useEffect(() => {
    reloadFileTree();
    apiFetch(`/files/process-owners`)
      .then(r => r.json()).then(setProcessOwners).catch(() => {});
    apiFetch(`/nao-conformidades/indicadores`)
      .then(r => r.json()).then(setNcIndicadores).catch(() => {});
  }, []);

  // Total de NC abertas (soma de todos os anos) - usado no KPI do topo e no painel
  // lateral; derivado do mesmo agregado já recebido, sem pedido extra ao backend.
  const totalNcAbertas = ncIndicadores
    ? Object.values(ncIndicadores.abertasPorAno).reduce((acc, n) => acc + n, 0)
    : null;
  const anosNc = ncIndicadores
    ? [...new Set([...Object.keys(ncIndicadores.registadasPorAno), ...Object.keys(ncIndicadores.abertasPorAno)])].sort((a, b) => b - a)
    : [];

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    const processName = filePath.split('/')[0];
    const ownerStr = processOwners[processName];
    const canEdit = isSuperAdmin || (ownerStr && ownerStr.split(',').map(n => n.trim()).includes(username));
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath, canEdit, isSuperAdmin } });
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

  const ncSubHeaderStyle = { fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 };
  const ncRowStyle = { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #f9fafb" };
  const ncEmptyStyle = { fontSize: 12.5, color: "#9ca3af", fontStyle: "italic" };

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
    {
      label: "Não conformidades",
      value: totalNcAbertas ?? " - ",
      sub: "abertas",
      bar: totalNcAbertas ? Math.min(100, totalNcAbertas * 10) : 0,
      barColor: "#ef4444",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="📊" title="Dashboard" searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <div className="p-4 sm:p-6" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

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
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

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
                  const canManage = isSuperAdmin || p.dono.split(',').map(n => n.trim()).includes(username);
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
                        {isSuperAdmin && <DeleteButton file={{ name: p.nome }} currentPath={[]} onDelete={reloadFileTree} isFolder size={ICON_SIZE} className={deleteBtnClass} />}
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

              {/* Indicadores de Não Conformidades */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Indicadores de Não Conformidades</span>
                </div>
                <div style={{ padding: 18 }}>
                  {!ncIndicadores ? (
                    <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "12px 0" }}>A carregar indicadores...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {/* Nº de NC registadas por ano */}
                      <div>
                        <div style={ncSubHeaderStyle}>Nº de NC registadas por ano</div>
                        {anosNc.length === 0 ? (
                          <div style={ncEmptyStyle}>Sem registos.</div>
                        ) : anosNc.map((ano) => (
                          <div key={ano} style={ncRowStyle}>
                            <span style={{ color: "#374151" }}>{ano}</span>
                            <span style={{ fontWeight: 600, color: "#111827" }}>{ncIndicadores.registadasPorAno[ano] || 0}</span>
                          </div>
                        ))}
                      </div>

                      {/* Nº de NC abertas por ano */}
                      <div>
                        <div style={ncSubHeaderStyle}>Nº de NC abertas por ano</div>
                        {anosNc.length === 0 ? (
                          <div style={ncEmptyStyle}>Sem registos.</div>
                        ) : anosNc.map((ano) => (
                          <div key={ano} style={ncRowStyle}>
                            <span style={{ color: "#374151" }}>{ano}</span>
                            <span style={{ fontWeight: 600, color: (ncIndicadores.abertasPorAno[ano] || 0) > 0 ? "#ef4444" : "#111827" }}>
                              {ncIndicadores.abertasPorAno[ano] || 0}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Taxa de tratamento (todas as NC, todos os anos) */}
                      <div>
                        <div style={ncSubHeaderStyle}>Taxa de tratamento</div>
                        {ncIndicadores.taxaTratamento.registadas === 0 ? (
                          <div style={ncEmptyStyle}>Sem NC registadas.</div>
                        ) : (
                          <>
                            <div style={{ fontSize: 28, fontWeight: 700, color: gold }}>{ncIndicadores.taxaTratamento.percentagem}%</div>
                            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 4, lineHeight: 1.5 }}>
                              {ncIndicadores.taxaTratamento.tratadasOuFechadas} de {ncIndicadores.taxaTratamento.registadas} NC já em
                              "Tratada" ou "Fechada" (todos os anos)
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tempo médio de tratamento em dias, por gravidade */}
                      <div>
                        <div style={ncSubHeaderStyle}>Tempo médio de tratamento</div>
                        {GRAVIDADES.map((g) => {
                          const dias = ncIndicadores.tempoMedioTratamentoDias[g];
                          return (
                            <div key={g} style={ncRowStyle}>
                              <span style={{ color: "#374151" }}>{g}</span>
                              <span style={{ fontWeight: 600, color: "#111827" }}>
                                {dias != null ? `${dias.toLocaleString("pt-PT", { minimumFractionDigits: 1 })} dias` : "Sem dados"}
                              </span>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 10.5, color: "#d1d5db", marginTop: 8, lineHeight: 1.4 }}>
                          Só considera NC que já atingiram o estado "Tratada" (registo até tratamento).
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AIAssistant fileTree={filteredTree} searchTerm={searchTerm} username={username} isAdmin={isSuperAdmin} isSuperAdmin={isSuperAdmin} processOwners={processOwners} onSuggestion={() => {}} />
      <KonamiWordle />
    </div>
  );
}
