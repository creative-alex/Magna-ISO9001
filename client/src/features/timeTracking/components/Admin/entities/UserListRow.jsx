import React from "react";
import { FaChevronRight } from "react-icons/fa6";
import UserAvatar from "../../../../../shared/components/UserAvatar";

// Aviso de alterações de horas por aprovar (AjustesPendentes) - mesmo estilo do
// KmPendenteBadge de /salarios (ProcessamentoSalarios.jsx).
function AjustesPendentesBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "#FEF3C7", color: "#92400E", whiteSpace: "nowrap" }}>
      Ajustes por aprovar{count > 1 ? ` (${count})` : ""}
    </span>
  );
}

export default function UserListRow({ user, onClick, isLast, indent = false, ajustesPendentes = 0 }) {
  return (
    <div
      onClick={() => onClick(user)}
      style={{
        display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
        padding: indent ? "14px 20px 14px 44px" : "14px 20px",
        borderBottom: isLast ? "none" : "1px solid #f3f4f6",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
      onMouseLeave={e => e.currentTarget.style.background = ""}
    >
      <UserAvatar nome={user.nome} size={indent ? 32 : 36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{user.nome}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{user.email}</div>
      </div>
      <AjustesPendentesBadge count={ajustesPendentes} />
      <FaChevronRight style={{ fontSize: 11, color: "#d1d5db", flexShrink: 0 }} />
    </div>
  );
}
