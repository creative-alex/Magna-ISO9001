import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../../../shared/utils/apiFetch';
import UserListRow from './UserListRow';

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
        users.map((u, index) => (
          <UserListRow key={u.uid} user={u} onClick={openUser} isLast={index === users.length - 1} />
        ))
      )}
    </div>
  );
};

export default EntityUserList;
