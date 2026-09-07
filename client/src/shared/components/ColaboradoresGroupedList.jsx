import React, { useEffect, useMemo, useState } from "react";
import { FaIdCard, FaMagnifyingGlass, FaChevronRight, FaBuilding } from "react-icons/fa6";
import { apiFetch } from "../utils/apiFetch";

const GOLD = "#C8932F";
const SEM_ENTIDADE = "Sem entidade";

// Cores do badge de estado "hoje" (ver getColaboradoresStatusHoje no usersController) -
// qualquer estado não mapeado aqui (ex: um texto de situação contratual inesperado) cai
// no estilo default (cinzento).
const STATUS_STYLES = {
  "Ativo": { bg: "#DCFCE7", color: "#15803D" },
  "Férias": { bg: "#DBEAFE", color: "#1D4ED8" },
  "Baixa médica": { bg: "#FFEDD5", color: "#C2410C" },
  "Licença": { bg: "#F3E8FF", color: "#7E22CE" },
  "Cedência temporária": { bg: "#E0F2FE", color: "#0369A1" },
  "Cessado": { bg: "#FEE2E2", color: "#B91C1C" },
  "Suspenso": { bg: "#FEF3C7", color: "#B45309" },
  "Reformado": { bg: "#F3F4F6", color: "#374151" },
};
const STATUS_STYLE_DEFAULT = { bg: "#F3F4F6", color: "#374151" };

export default function ColaboradoresGroupedList({ title, subtitle, onSelect, showStatusHoje = false }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [statusHoje, setStatusHoje] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/users/getColaboradores");
        if (res.ok) setColaboradores(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showStatusHoje) return;
    (async () => {
      try {
        const res = await apiFetch("/users/getColaboradoresStatusHoje");
        if (res.ok) {
          const data = await res.json();
          setStatusHoje(Object.fromEntries((data || []).map(e => [e.id, e.estado])));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [showStatusHoje]);

  const toggleGroup = (entidade) => setCollapsed(prev => ({ ...prev, [entidade]: !prev[entidade] }));

  const filtered = colaboradores.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const groups = useMemo(() => {
    const byEntidade = {};
    filtered.forEach(c => {
      const key = c.entidade || SEM_ENTIDADE;
      (byEntidade[key] = byEntidade[key] || []).push(c);
    });
    return Object.entries(byEntidade).sort(([a], [b]) => {
      if (a === SEM_ENTIDADE) return 1;
      if (b === SEM_ENTIDADE) return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const renderColaborador = (c, isLast) => {
    const initials = c.nome ? c.nome.slice(0, 2).toUpperCase() : "??";
    return (
      <div
        key={c.id}
        onClick={() => onSelect(c)}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer",
          borderBottom: isLast ? "none" : "1px solid #f3f4f6",
          transition: "background 0.12s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
        onMouseLeave={e => e.currentTarget.style.background = ""}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: GOLD, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
        </div>
        {showStatusHoje && statusHoje[c.id] && (() => {
          const style = STATUS_STYLES[statusHoje[c.id]] || STATUS_STYLE_DEFAULT;
          return (
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
              background: style.bg, color: style.color, whiteSpace: "nowrap",
            }}>
              {statusHoje[c.id]}
            </span>
          );
        })()}
        <FaIdCard style={{ fontSize: 13, color: "#d1d5db", flexShrink: 0 }} />
        <FaChevronRight style={{ fontSize: 11, color: "#d1d5db", flexShrink: 0 }} />
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{subtitle}</div>
        </div>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 220 }}>
          <FaMagnifyingGlass style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar colaborador..."
            style={{
              padding: "8px 12px 8px 32px", fontSize: 13, width: "100%", boxSizing: "border-box",
              border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", background: "#fafafa",
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
          A carregar colaboradores...
        </div>
      ) : groups.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
          {colaboradores.length === 0 ? "Sem colaboradores registados." : "Nenhum colaborador corresponde à pesquisa."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.map(([entidade, membros]) => {
            const isCollapsed = !!collapsed[entidade];
            return (
              <div key={entidade} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div
                  onClick={() => toggleGroup(entidade)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: "pointer",
                    background: "#fafafa", borderBottom: isCollapsed ? "none" : "1px solid #f3f4f6",
                  }}
                >
                  <FaBuilding style={{ fontSize: 13, color: GOLD, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entidade}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{membros.length}</span>
                  <FaChevronRight style={{
                    fontSize: 11, color: "#9ca3af", flexShrink: 0,
                    transform: isCollapsed ? "none" : "rotate(90deg)", transition: "transform 0.15s",
                  }} />
                </div>
                {!isCollapsed && membros.map((c, i) => renderColaborador(c, i === membros.length - 1))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}