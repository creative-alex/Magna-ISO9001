const { WebSocketServer } = require("ws");
const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR } = require("../../shared/middleware/auth");

const MAX_TEXTO_LENGTH = 2000;

// Uma sala por colaborador (conversas/{colaboradorId}); GestorRH/SuperAdmin
// entram na sala do colaborador que estão a ver. gestorLobby tem todos os
// sockets de gestores ligados, para receberem notificação de nova mensagem
// mesmo sem terem essa conversa aberta (atualiza a lista/badges em tempo real).
const rooms = new Map(); // colaboradorId -> Set<ws>
const gestorLobby = new Set();

function joinRoom(colaboradorId, ws) {
  if (!rooms.has(colaboradorId)) rooms.set(colaboradorId, new Set());
  rooms.get(colaboradorId).add(ws);
}

function leaveRoom(colaboradorId, ws) {
  const set = rooms.get(colaboradorId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(colaboradorId);
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function broadcastToRoom(colaboradorId, payload, exceptWs) {
  const set = rooms.get(colaboradorId);
  if (!set) return;
  set.forEach((client) => { if (client !== exceptWs) send(client, payload); });
}

function broadcastToLobby(payload, exceptColaboradorId) {
  gestorLobby.forEach((client) => {
    if (client.chatMeta?.colaboradorId !== exceptColaboradorId) send(client, payload);
  });
}

async function authenticate(token) {
  const decodedToken = await admin.auth().verifyIdToken(token);
  let userDoc = await db.collection("users").doc(decodedToken.uid).get();
  let userData = {};
  if (userDoc.exists) {
    userData = userDoc.data();
  } else {
    const querySnapshot = await db.collection("users").where("email", "==", decodedToken.email).get();
    if (!querySnapshot.empty) userData = querySnapshot.docs[0].data();
  }
  return {
    uid: decodedToken.uid,
    nome: userData.nome || decodedToken.name || "Utilizador",
    nivelAcesso: userData.nivelAcesso || "Colaborador",
  };
}

async function persistMensagem(colaboradorId, colaboradorNome, autor, texto) {
  const conversaRef = db.collection("conversas").doc(colaboradorId);
  const mensagemRef = conversaRef.collection("mensagens").doc();
  const criadoEm = admin.firestore.FieldValue.serverTimestamp();

  await mensagemRef.set({
    autorId: autor.uid,
    autorNome: autor.nome,
    autorTipo: autor.isGestor ? "gestor" : "colaborador",
    texto,
    criadoEm,
  });

  await conversaRef.set({
    colaboradorId,
    colaboradorNome,
    lastMessage: texto,
    lastMessageAt: criadoEm,
    unreadForGestor: autor.isGestor ? false : true,
    unreadForColaborador: autor.isGestor ? true : false,
  }, { merge: true });

  const mensagemDoc = await mensagemRef.get();
  const data = mensagemDoc.data();
  return {
    id: mensagemDoc.id,
    autorId: data.autorId,
    autorNome: data.autorNome,
    autorTipo: data.autorTipo,
    texto: data.texto,
    criadoEm: data.criadoEm ? data.criadoEm.toDate().toISOString() : new Date().toISOString(),
  };
}

function attachChatWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, "http://localhost");
    let user;
    try {
      const token = url.searchParams.get("token");
      if (!token) throw new Error("Token nao fornecido");
      user = await authenticate(token);
    } catch (error) {
      send(ws, { type: "error", message: "Falha na autenticação" });
      ws.close();
      return;
    }

    const isGestor = isAdminOrHR(user.nivelAcesso);
    const requestedColaboradorId = url.searchParams.get("colaboradorId");
    // Colaborador (e Administrador) só pode conversar sobre si próprio; GestorRH/
    // SuperAdmin escolhe com quem falar através do colaboradorId pedido.
    const colaboradorId = isGestor ? requestedColaboradorId : user.uid;

    ws.chatMeta = { uid: user.uid, nome: user.nome, isGestor, colaboradorId };

    if (isGestor) gestorLobby.add(ws);
    if (colaboradorId) {
      joinRoom(colaboradorId, ws);

      try {
        let colaboradorNome = isGestor ? null : user.nome;
        if (isGestor && !colaboradorNome) {
          const colaboradorDoc = await db.collection("users").doc(colaboradorId).get();
          colaboradorNome = colaboradorDoc.exists ? (colaboradorDoc.data().nome || "Colaborador") : "Colaborador";
        }
        ws.chatMeta.colaboradorNome = colaboradorNome;
      } catch (error) {
        console.error("Erro ao resolver nome do colaborador no chat:", error);
      }
    }

    send(ws, { type: "connected", colaboradorId });

    ws.on("message", async (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch (error) {
        return send(ws, { type: "error", message: "Mensagem inválida" });
      }

      if (payload.type !== "send") return;

      const texto = typeof payload.texto === "string" ? payload.texto.trim() : "";
      if (!texto || texto.length > MAX_TEXTO_LENGTH) {
        return send(ws, { type: "error", message: "Texto inválido" });
      }

      const targetColaboradorId = ws.chatMeta.colaboradorId;
      if (!targetColaboradorId) {
        return send(ws, { type: "error", message: "Nenhuma conversa selecionada" });
      }

      try {
        const colaboradorNome = ws.chatMeta.isGestor
          ? ws.chatMeta.colaboradorNome
          : ws.chatMeta.nome;

        const mensagem = await persistMensagem(
          targetColaboradorId,
          colaboradorNome,
          { uid: ws.chatMeta.uid, nome: ws.chatMeta.nome, isGestor: ws.chatMeta.isGestor },
          texto
        );

        broadcastToRoom(targetColaboradorId, { type: "message", colaboradorId: targetColaboradorId, mensagem });
        broadcastToLobby({
          type: "update",
          colaboradorId: targetColaboradorId,
          colaboradorNome,
          lastMessage: mensagem.texto,
          lastMessageAt: mensagem.criadoEm,
        }, targetColaboradorId);
      } catch (error) {
        console.error("Erro ao gravar mensagem do chat:", error);
        send(ws, { type: "error", message: "Erro ao enviar mensagem" });
      }
    });

    ws.on("close", () => {
      gestorLobby.delete(ws);
      if (ws.chatMeta?.colaboradorId) leaveRoom(ws.chatMeta.colaboradorId, ws);
    });
  });

  return wss;
}

module.exports = { attachChatWebSocket };
