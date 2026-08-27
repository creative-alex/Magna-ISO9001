import React, { useContext, useEffect, useRef, useState } from "react";
import { FaPaperPlane } from "react-icons/fa6";
import { UserContext } from "../../../shared/context/userContext";
import { apiFetch } from "../../../shared/utils/apiFetch";
import { API_CONFIG } from "../../../shared/utils/constants";
import { useChatSocket } from "../hooks/useChatSocket";

const GOLD = "#C8932F";

function formatHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({ colaboradorId, colaboradorNome, onLobbyUpdate }) {
  const { uid } = useContext(UserContext);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const { mensagens: mensagensAoVivo, connected, sendMessage } = useChatSocket(colaboradorId, onLobbyUpdate);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHistorico([]);

    if (!colaboradorId) {
      setLoading(false);
      return;
    }

    apiFetch(`${API_CONFIG.ENDPOINTS.CHAT}/mensagens/${colaboradorId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => { if (!cancelled) setHistorico(data.mensagens || []); })
      .catch(() => { if (!cancelled) setHistorico([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    apiFetch(`${API_CONFIG.ENDPOINTS.CHAT}/marcar-lida/${colaboradorId}`, { method: "POST" }).catch(() => {});

    return () => { cancelled = true; };
  }, [colaboradorId]);

  const idsHistorico = new Set(historico.map((m) => m.id));
  const mensagens = [...historico, ...mensagensAoVivo.filter((m) => !idsHistorico.has(m.id))];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  const handleSend = () => {
    const texto = input.trim();
    if (!texto) return;
    sendMessage(texto);
    setInput("");
  };

  if (!colaboradorId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400">
        Seleciona uma conversa para começar.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-[30px] h-[30px] rounded-full bg-[#C8932F] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
          {(colaboradorNome || "?").slice(0, 2).toUpperCase()}
        </div>
        <span className="text-[14px] font-semibold text-gray-900">{colaboradorNome || "Conversa"}</span>
        {!connected && <span className="ml-auto text-[11px] text-gray-400">A ligar...</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0">
        {loading && <div className="text-[13px] text-gray-400 text-center mt-6">A carregar mensagens...</div>}
        {!loading && mensagens.length === 0 && (
          <div className="text-[13px] text-gray-400 text-center mt-6">Ainda não há mensagens. Diz olá!</div>
        )}
        {mensagens.map((m) => {
          const isMine = m.autorId === uid;
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-[13px] leading-snug whitespace-pre-wrap break-words ${
                  isMine ? "bg-[#C8932F] text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}
              >
                {m.texto}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                {isMine ? "" : `${m.autorNome} · `}{formatHora(m.criadoEm)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Escreve uma mensagem..."
          className="flex-1 py-2 px-3 text-[13px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-[36px] h-[36px] rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-40"
          style={{ background: GOLD }}
          title="Enviar"
        >
          <FaPaperPlane style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}
