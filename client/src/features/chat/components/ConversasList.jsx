import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../shared/utils/apiFetch";
import { API_CONFIG } from "../../../shared/utils/constants";

function formatData(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

export default function ConversasList({ selectedId, onSelect, liveUpdate, onConversaResolved }) {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_CONFIG.ENDPOINTS.CHAT}/conversas`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        const lista = data.conversas || [];
        setConversas(lista);
        const atual = lista.find((c) => c.colaboradorId === selectedId);
        if (atual) onConversaResolved?.(atual.colaboradorNome);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica notificações em tempo real (nova mensagem numa conversa que não
  // está aberta) sem re-pedir a lista toda ao servidor.
  useEffect(() => {
    if (!liveUpdate) return;
    setConversas((prev) => {
      const atualizada = {
        colaboradorId: liveUpdate.colaboradorId,
        colaboradorNome: liveUpdate.colaboradorNome,
        lastMessage: liveUpdate.lastMessage,
        lastMessageAt: liveUpdate.lastMessageAt,
        unreadForGestor: true,
      };
      const resto = prev.filter((c) => c.colaboradorId !== liveUpdate.colaboradorId);
      return [atualizada, ...resto];
    });
  }, [liveUpdate]);

  return (
    <div className="w-[280px] border-r border-gray-200 flex flex-col min-h-0 shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 text-[13px] font-semibold text-gray-900">
        Conversas
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="px-4 py-4 text-[12px] text-gray-400">A carregar...</div>}
        {!loading && conversas.length === 0 && (
          <div className="px-4 py-4 text-[12px] text-gray-400">Ainda não há conversas.</div>
        )}
        {conversas.map((c) => (
          <div
            key={c.colaboradorId}
            onClick={() => {
              setConversas((prev) => prev.map((item) => (
                item.colaboradorId === c.colaboradorId ? { ...item, unreadForGestor: false } : item
              )));
              onSelect(c);
            }}
            className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors duration-150 ${
              selectedId === c.colaboradorId ? "bg-[#FDF3DE]" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-gray-900 truncate">{c.colaboradorNome}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{formatData(c.lastMessageAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[12px] text-gray-500 truncate">{c.lastMessage}</span>
              {c.unreadForGestor && <span className="w-2 h-2 rounded-full bg-[#C8932F] shrink-0" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
