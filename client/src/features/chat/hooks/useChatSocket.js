import { useEffect, useRef, useState } from "react";
import { auth } from "../../../shared/utils/firebase";
import { API_CONFIG } from "../../../shared/utils/constants";

// Liga um WebSocket à conversa `colaboradorId` (null = só entra na "gestorLobby",
// sem sala de mensagens - usado pelo GestorRH/SuperAdmin enquanto navega a lista
// sem ter nenhuma conversa aberta). Religa sempre que colaboradorId muda.
export function useChatSocket(colaboradorId, onLobbyUpdate) {
  const [mensagens, setMensagens] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onLobbyUpdateRef = useRef(onLobbyUpdate);
  onLobbyUpdateRef.current = onLobbyUpdate;

  useEffect(() => {
    let cancelled = false;
    let ws = null;

    setMensagens([]);
    setConnected(false);

    (async () => {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      if (cancelled) return;

      const params = new URLSearchParams({ token });
      if (colaboradorId) params.set("colaboradorId", colaboradorId);

      ws = new WebSocket(`${API_CONFIG.WS_URL}/ws/chat?${params.toString()}`);
      wsRef.current = ws;

      ws.onopen = () => { if (!cancelled) setConnected(true); };
      ws.onclose = () => { if (!cancelled) setConnected(false); };

      ws.onmessage = (event) => {
        if (cancelled) return;
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          return;
        }

        if (payload.type === "message" && payload.colaboradorId === colaboradorId) {
          setMensagens((prev) => [...prev, payload.mensagem]);
        } else if (payload.type === "update") {
          onLobbyUpdateRef.current?.(payload);
        }
      };
    })();

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
    };
  }, [colaboradorId]);

  const sendMessage = (texto) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "send", texto }));
    }
  };

  return { mensagens, setMensagens, sendMessage, connected };
}
