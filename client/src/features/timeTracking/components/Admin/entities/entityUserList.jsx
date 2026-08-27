import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../../utils/apiFetch';

const GOLD = "#C8932F";

const EntityUserList = ({ entityName }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!entityName) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/timetracking/byEntity`, {
          method: 'POST',
          body: JSON.stringify({ entidadeNome: entityName }),
        });

        if (!res.ok) throw new Error('Erro ao buscar colaboradores');
        const data = await res.json();
        const sorted = Array.isArray(data) ? data.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')) : [];
        setUsers(sorted);
      } catch (err) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [entityName]);

  const openUser = (user) => {
    if (!user || !user.uid) return;
    localStorage.setItem('selectedUserUID', user.uid);
    navigate(`/ponto/user-details/${user.uid}`);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Colaboradores</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{users.length} no total</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>A carregar colaboradores...</p>
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#E86F51", fontWeight: 500, fontSize: 13, margin: 0 }}>Erro: {error}</p>
        </div>
      ) : !users.length ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>Nenhum colaborador encontrado.</p>
        </div>
      ) : (
        users.map((u, index) => {
          const initials = u.nome ? u.nome.slice(0, 2).toUpperCase() : "??";
          return (
            <div
              key={u.uid}
              onClick={() => openUser(u)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer",
                borderBottom: index === users.length - 1 ? "none" : "1px solid #f3f4f6",
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
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{u.nome}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{u.email}</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20, color: "#d1d5db", flexShrink: 0 }} viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 1 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
              </svg>
            </div>
          );
        })
      )}
    </div>
  );
};

export default EntityUserList;
