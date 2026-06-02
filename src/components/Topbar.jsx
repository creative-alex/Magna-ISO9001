import React, { useContext } from "react";
import { UserContext } from "../context/userContext";

export default function Topbar({ icon, title, searchTerm, onSearchChange, adminButtons }) {
  const { username } = useContext(UserContext);

  return (
    <div className="topbar">
      <div className="breadcrumb">
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span className="sep">›</span>
        <span className="current">{title}</span>
      </div>
      {onSearchChange && (
        <div className="topbar-search">
          <span style={{ position: 'absolute', left: 10, fontSize: 14, color: '#9ca3af' }}>🔍</span>
          <input type="text" placeholder="Pesquisar arquivos..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
      )}
      <span className="topbar-user" style={{ marginLeft: !onSearchChange ? "auto" : 0 }}>Olá, {username}</span>
    </div>
  );
}
