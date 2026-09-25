import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBoxArchive, FaCalendarDays, FaChevronRight, FaCircleCheck, FaClipboardCheck,
  FaClipboardList, FaFileLines, FaGauge, FaTableCellsLarge, FaTableColumns, FaTimeline,
  FaTriangleExclamation, FaUserCheck,
} from "react-icons/fa6";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import { apiFetch } from "../../shared/utils/apiFetch";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { NC_ESTADOS, ncEstadoLabel } from "./estados";
import NaoConformidadeDetail from "./NaoConformidadeDetail";

const GOLD = "#C8932F";
const gravityColor = { "Pouco grave": "#22c55e", "Grave": "#f59e0b", "Muito grave": "#ef4444" };
const ESTADO_ICON = { registada: FaFileLines, para_tratamento: FaTriangleExclamation, tratada: FaClipboardCheck, fechada: FaCircleCheck };

const VIEW_MODES = [
  { key: "kanban", label: "Kanban", icon: FaTableColumns },
  { key: "grid", label: "Grelha", icon: FaTableCellsLarge },
  { key: "timeline", label: "Linha do tempo", icon: FaTimeline },
  { key: "tiles", label: "Resumo", icon: FaGauge },
];

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function monthKey(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "sem-data";
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function monthLabel(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "Sem data";
  return `${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("pt-PT"); } catch { return iso; }
}

function acoesPct(nc) {
  return nc.totalAcoes > 0 ? Math.round((nc.acoesEficazes / nc.totalAcoes) * 100) : 0;
}

function ProgressMini({ nc, className }) {
  if (!nc.totalAcoes) return null;
  return (
    <span className={`flex items-center gap-1.5 flex-shrink-0 ${className || ""}`}>
      <span className="w-8 h-1 rounded-full bg-gray-100 overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${acoesPct(nc)}%`, background: "#22c55e" }} />
      </span>
      {nc.acoesEficazes}/{nc.totalAcoes}
    </span>
  );
}

// --- Kanban: agrupado por estado - cor lateral passa a indicar gravidade, já que o
// estado já está implícito na coluna.
function KanbanCard({ nc, onClick }) {
  const gColor = gravityColor[nc.gravidade] || "#6b7280";
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md hover:border-[#C8932F]/40 transition-all duration-150"
      style={{ borderLeftWidth: 3, borderLeftColor: gColor }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${gColor}1a`, color: gColor }}>
          {nc.gravidade}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-400 flex-shrink-0">
          <FaCalendarDays className="text-[9px]" /> {formatDate(nc.dataRegisto)}
        </span>
      </div>
      {nc.numero && <p className="text-[11px] font-semibold mb-1" style={{ color: GOLD }}>NC {nc.numero}</p>}
      <p className="text-sm text-gray-800 leading-snug line-clamp-2 mb-2">{nc.descricao}</p>
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1 min-w-0">
          <FaUserCheck className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{nc.responsavelTratamento?.nome || "Por atribuir"}</span>
        </span>
        <ProgressMini nc={nc} />
      </div>
    </button>
  );
}

function KanbanBoard({ lista, onOpen }) {
  const porEstado = {};
  Object.keys(NC_ESTADOS).forEach((k) => { porEstado[k] = []; });
  lista.forEach((nc) => { (porEstado[nc.estado] || (porEstado[nc.estado] = [])).push(nc); });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {Object.entries(NC_ESTADOS).map(([key, meta]) => {
        const items = porEstado[key] || [];
        return (
          <div key={key} className="bg-gray-100/70 rounded-2xl border border-gray-100 p-3 min-w-0">
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: meta.color }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                {meta.label}
              </span>
              <span className="text-xs font-semibold text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5 flex-shrink-0">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[65vh] pr-0.5">
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">Sem não conformidades.</p>
              ) : (
                items.map((nc) => <KanbanCard key={nc.id} nc={nc} onClick={() => onOpen(nc.id)} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Grelha: cartões compactos em 2-3 colunas, sem agrupamento por estado.
function GridCard({ nc, onClick }) {
  const eColor = NC_ESTADOS[nc.estado]?.color || "#6b7280";
  const gColor = gravityColor[nc.gravidade] || "#6b7280";
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-[#C8932F]/40 transition-all duration-150"
      style={{ borderLeftWidth: 4, borderLeftColor: eColor }}
    >
      <div className="flex items-center flex-wrap gap-1.5 mb-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${eColor}1a`, color: eColor }}>
          {ncEstadoLabel(nc.estado)}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${gColor}1a`, color: gColor }}>
          {nc.gravidade}
        </span>
      </div>
      {nc.numero && <p className="text-[11px] font-semibold mb-1" style={{ color: GOLD }}>NC {nc.numero}</p>}
      <p className="text-sm text-gray-800 line-clamp-3 mb-3 min-h-[3.6em]">{nc.descricao}</p>
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1">
        <span className="flex items-center gap-1 min-w-0">
          <FaUserCheck className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{nc.responsavelTratamento?.nome || "Por atribuir"}</span>
        </span>
        <span className="flex items-center gap-1 text-gray-400 flex-shrink-0">
          <FaCalendarDays className="text-[10px]" /> {formatDate(nc.dataRegisto)}
        </span>
      </div>
      {nc.totalAcoes > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
          <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${acoesPct(nc)}%`, background: "#22c55e" }} />
          </span>
          {nc.acoesEficazes}/{nc.totalAcoes}
        </div>
      )}
    </button>
  );
}

function GridView({ lista, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {lista.map((nc) => <GridCard key={nc.id} nc={nc} onClick={() => onOpen(nc.id)} />)}
    </div>
  );
}

// --- Linha do tempo: agrupada por mês de registo, mais recente primeiro (a lista já vem
// ordenada por dataRegisto desc da API, por isso não é preciso reordenar aqui).
function TimelineRow({ nc, onClick, isLast }) {
  const eColor = NC_ESTADOS[nc.estado]?.color || "#6b7280";
  const gColor = gravityColor[nc.gravidade] || "#6b7280";
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center w-4 flex-shrink-0">
        <span className="w-3.5 h-3.5 rounded-full border-2 bg-white flex-shrink-0 mt-2" style={{ borderColor: eColor }} />
        {!isLast && <span className="flex-1 w-px bg-gray-200 mt-1" />}
      </div>
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left bg-white rounded-xl shadow-sm border border-gray-100 px-3.5 py-2.5 mb-3 hover:shadow-md hover:border-[#C8932F]/40 transition-all duration-150"
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">{formatDate(nc.dataRegisto)}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${eColor}1a`, color: eColor }}>
            {ncEstadoLabel(nc.estado)}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${gColor}1a`, color: gColor }}>
            {nc.gravidade}
          </span>
        </div>
        {nc.numero && <p className="text-[11px] font-semibold mb-0.5" style={{ color: GOLD }}>NC {nc.numero}</p>}
        <p className="text-sm text-gray-800 truncate">{nc.descricao}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1 min-w-0">
            <FaUserCheck className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{nc.responsavelTratamento?.nome || "Por atribuir"}</span>
          </span>
          <ProgressMini nc={nc} />
        </div>
      </button>
    </div>
  );
}

function TimelineView({ lista, onOpen }) {
  const groups = [];
  const byKey = new Map();
  lista.forEach((nc) => {
    const key = monthKey(nc.dataRegisto);
    if (!byKey.has(key)) {
      const group = { key, label: monthLabel(nc.dataRegisto), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(nc);
  });

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-700 capitalize">{group.label}</span>
            <span className="text-xs text-gray-400">({group.items.length})</span>
            <span className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex flex-col">
            {group.items.map((nc, idx) => (
              <TimelineRow key={nc.id} nc={nc} onClick={() => onOpen(nc.id)} isLast={idx === group.items.length - 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Resumo: tiles KPI por estado + cartões finos, sem agrupamento.
function KpiTile({ label, count, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
      <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${color}1a`, color }}>
        <Icon />
      </span>
      <div>
        <div className="text-lg font-bold text-gray-800 leading-tight">{count}</div>
        <div className="text-[11px] text-gray-400 font-medium">{label}</div>
      </div>
    </div>
  );
}

function ThinCard({ nc, onClick }) {
  const eColor = NC_ESTADOS[nc.estado]?.color || "#6b7280";
  const gColor = gravityColor[nc.gravidade] || "#6b7280";
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 pl-3 pr-8 py-2.5 hover:shadow-md hover:border-[#C8932F]/40 transition-all duration-150"
      style={{ borderLeftWidth: 3, borderLeftColor: eColor }}
    >
      <FaChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300 group-hover:text-[#C8932F] transition-colors" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${eColor}1a`, color: eColor }}>
          {ncEstadoLabel(nc.estado)}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${gColor}1a`, color: gColor }}>
          {nc.gravidade}
        </span>
        {nc.numero && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: GOLD }}>NC {nc.numero}</span>}
        <span className="text-sm text-gray-800 truncate flex-1 min-w-[120px]">{nc.descricao}</span>
        <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <FaUserCheck className="text-gray-400" /> {nc.responsavelTratamento?.nome || "Por atribuir"}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(nc.dataRegisto)}</span>
      </div>
    </button>
  );
}

function TilesView({ lista, onOpen }) {
  const counts = {};
  Object.keys(NC_ESTADOS).forEach((k) => { counts[k] = 0; });
  lista.forEach((nc) => { counts[nc.estado] = (counts[nc.estado] || 0) + 1; });

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {Object.entries(NC_ESTADOS).map(([key, meta]) => (
          <KpiTile key={key} label={meta.label} count={counts[key] || 0} color={meta.color} icon={ESTADO_ICON[key] || FaClipboardList} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {lista.map((nc) => <ThinCard key={nc.id} nc={nc} onClick={() => onOpen(nc.id)} />)}
      </div>
    </div>
  );
}

export default function TratamentoNaoConformidade() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isGestorQualidade } = usePermissions();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem("ncListViewMode");
      return VIEW_MODES.some((v) => v.key === saved) ? saved : "kanban";
    } catch { return "kanban"; }
  });

  useEffect(() => {
    try { localStorage.setItem("ncListViewMode", viewMode); } catch { /* ignora, é só uma preferência de UI */ }
  }, [viewMode]);

  const fetchLista = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/nao-conformidades`);
      if (!res.ok) throw new Error("Não foi possível carregar as não conformidades.");
      setLista(await res.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLista(); }, [fetchLista]);

  const onOpen = (ncId) => navigate(`/tratar-nao-conformidade/${ncId}`);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🛠️" title="Tratamento de Não Conformidades/Reclamações" />

        <div className="flex-1 p-6">
          {id ? (
            <div className="w-full max-w-3xl mx-auto">
              <NaoConformidadeDetail id={id} onBack={() => navigate("/tratar-nao-conformidade")} onChanged={fetchLista} />
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex items-start gap-3 mb-6">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: "#f5e6ca", color: GOLD }}>
                  <FaClipboardList />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-800 leading-tight">Tratamento de Não Conformidades/Reclamações</h1>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-2xl">
                    {isGestorQualidade
                      ? "Consulte, catalogue, atribua responsáveis e acompanhe todas as não conformidades da organização."
                      : "Pode consultar todas as não conformidades da organização. Só pode interagir (preencher o tratamento, marcar ações como implementadas, etc.) nas que lhe estiverem atribuídas ou em que estiver envolvido/a."}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-100 p-12">
                  <span className="w-6 h-6 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: GOLD }} />
                  <span className="text-sm text-gray-400">A carregar...</span>
                </div>
              ) : lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center bg-white rounded-2xl border border-gray-100 p-12">
                  <FaBoxArchive className="text-2xl text-gray-300 mb-1" />
                  <span className="text-sm text-gray-400 italic">Nenhuma não conformidade encontrada.</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <span className="text-xs text-gray-400 font-medium">
                      {lista.length} não conformidade{lista.length === 1 ? "" : "s"} no total
                    </span>
                    <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
                      {VIEW_MODES.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          title={label}
                          onClick={() => setViewMode(key)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
                          style={viewMode === key ? { background: GOLD, color: "#fff" } : { color: "#6b7280" }}
                        >
                          <Icon />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {viewMode === "kanban" && <KanbanBoard lista={lista} onOpen={onOpen} />}
                  {viewMode === "grid" && <GridView lista={lista} onOpen={onOpen} />}
                  {viewMode === "timeline" && <TimelineView lista={lista} onOpen={onOpen} />}
                  {viewMode === "tiles" && <TilesView lista={lista} onOpen={onOpen} />}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
