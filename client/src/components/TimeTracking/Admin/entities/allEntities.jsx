import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaBuilding, FaChevronRight, FaGear, FaMagnifyingGlass } from "react-icons/fa6";
import Entity from "./Entity";
import { apiFetch } from "../../../../utils/apiFetch";

const GOLD = "#C8932F";

const cardEmpty = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" };
const btnGoldOutline = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 999, border: `1.5px solid ${GOLD}`, color: GOLD, background: "transparent", cursor: "pointer" };
const btnGoldSolid = { padding: "8px 16px", fontSize: 12, fontWeight: 500, borderRadius: 999, border: "none", color: "#fff", background: GOLD, cursor: "pointer" };

const normalizeEntitySlug = (entity) => entity.toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/&/g, 'e')
  .replace(/-/g, ' ')
  .replace(/[^a-z0-9\s]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

// Componente de detalhe da entidade
const EntityDetail = () => {
  const { entityName } = useParams();
  return <Entity entityName={entityName} />;
};

const AllEntities = () => {
  const [entities, setEntities] = useState([]);
  const [entityCount, setEntityCount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [usersByEntity, setUsersByEntity] = useState({});
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/entities/showEntities`, { method: "POST" });
        if (!response.ok) throw new Error("Erro ao buscar entidades");

        const data = await response.json();
        let entityNames;
        if (typeof data === "object" && !Array.isArray(data)) {
          entityNames = Object.values(data.entityNames);
          setEntityCount(data.entityCount);
        } else if (Array.isArray(data)) {
          entityNames = data;
          setEntityCount(data.length);
        } else {
          throw new Error("Os dados recebidos não têm um formato válido.");
        }
        setEntities(entityNames);

        const usersPerEntity = await Promise.all(entityNames.map(async (entityName) => {
          try {
            const res = await apiFetch(`/timetracking/byEntity`, {
              method: "POST",
              body: JSON.stringify({ entidadeNome: entityName }),
            });
            const usersData = res.ok ? await res.json() : [];
            const sorted = Array.isArray(usersData) ? [...usersData].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')) : [];
            return [entityName, sorted];
          } catch (err) {
            return [entityName, []];
          }
        }));
        setUsersByEntity(Object.fromEntries(usersPerEntity));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleEntity = (entity) => setExpanded(prev => ({ ...prev, [entity]: prev[entity] === false ? true : false }));

  const openUser = (user) => {
    if (!user || !user.uid) return;
    localStorage.setItem('selectedUserUID', user.uid);
    navigate(`/ponto/user-details/${user.uid}`);
  };

  const searchTerm = search.trim().toLowerCase();

  const visibleEntities = useMemo(() => {
    if (!searchTerm) return entities;
    return entities.filter(entity => (usersByEntity[entity] || []).some(u =>
      (u.nome || "").toLowerCase().includes(searchTerm) || (u.email || "").toLowerCase().includes(searchTerm)
    ));
  }, [entities, usersByEntity, searchTerm]);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Entidades <span style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>({entityCount})</span></div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>Agrupados por entidade. Expande uma entidade para consultar os seus colaboradores.</div>
        </div>
        <div style={{ position: "relative" }}>
          <FaMagnifyingGlass style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar colaborador..."
            style={{
              padding: "8px 12px 8px 32px", fontSize: 13, width: 220,
              border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", background: "#fafafa",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/ponto/nova-entidade">
            <button style={btnGoldOutline}>+ Nova Entidade</button>
          </Link>
          <Link to="/ponto/novo-user">
            <button style={btnGoldOutline}>+ Novo Utilizador</button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={cardEmpty}>A carregar entidades...</div>
      ) : error ? (
        <div style={{ ...cardEmpty, color: "#E86F51" }}>Erro: {error}</div>
      ) : entities.length === 0 ? (
        <div style={cardEmpty}>
          <p style={{ marginBottom: 14 }}>Ainda não existem entidades registadas.</p>
          <Link to="/ponto/nova-entidade">
            <button style={btnGoldSolid}>Criar a primeira entidade</button>
          </Link>
        </div>
      ) : visibleEntities.length === 0 ? (
        <div style={cardEmpty}>Nenhum colaborador corresponde à pesquisa.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visibleEntities.map((entity) => {
            const isOpen = expanded[entity] !== false;
            const allUsers = usersByEntity[entity] || [];
            const users = searchTerm
              ? allUsers.filter(u => (u.nome || "").toLowerCase().includes(searchTerm) || (u.email || "").toLowerCase().includes(searchTerm))
              : allUsers;

            return (
              <div key={entity} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div
                  onClick={() => toggleEntity(entity)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: "pointer",
                    background: "#fafafa", borderBottom: isOpen ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <FaBuilding style={{ fontSize: 13, color: GOLD, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{entity}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{users.length}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/ponto/entidades/${normalizeEntitySlug(entity)}`); }}
                    title="Gerir entidade"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                      borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#9ca3af", cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    <FaGear style={{ fontSize: 11 }} />
                  </button>
                  <FaChevronRight style={{
                    fontSize: 11, color: "#9ca3af", flexShrink: 0,
                    transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s",
                  }} />
                </div>

                {isOpen && (
                  users.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                      {searchTerm ? "Nenhum colaborador corresponde à pesquisa." : "Nenhum colaborador nesta entidade."}
                    </div>
                  ) : (
                    users.map((u, i) => {
                      const initials = u.nome ? u.nome.slice(0, 2).toUpperCase() : "??";
                      return (
                        <div
                          key={u.uid}
                          onClick={() => openUser(u)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14, padding: "14px 20px 14px 44px", cursor: "pointer",
                            borderBottom: i === users.length - 1 ? "none" : "1px solid #f3f4f6",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: GOLD, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "#fff",
                          }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{u.nome}</div>
                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{u.email}</div>
                          </div>
                          <FaChevronRight style={{ fontSize: 11, color: "#d1d5db", flexShrink: 0 }} />
                        </div>
                      );
                    })
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { AllEntities, EntityDetail };
