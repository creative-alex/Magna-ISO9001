import React, { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserContext } from "../../../shared/context/userContext";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import ConversasList from "../components/ConversasList";
import ChatWindow from "../components/ChatWindow";

export default function Chat() {
  const navigate = useNavigate();
  const { colaboradorId: colaboradorIdParam } = useParams();
  const { uid, username, nivelAcesso } = useContext(UserContext);
  const isGestor = nivelAcesso === "SuperAdmin" || nivelAcesso === "GestorRH";
  const [liveUpdate, setLiveUpdate] = useState(null);
  const [selectedNome, setSelectedNome] = useState(null);

  const colaboradorId = isGestor ? colaboradorIdParam : uid;
  const colaboradorNome = isGestor ? selectedNome : username;

  const handleSelect = (conversa) => {
    setSelectedNome(conversa.colaboradorNome);
    navigate(`/chat/${conversa.colaboradorId}`);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="ml-[230px] flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar icon="💬" title="Chat com RH" />

        <div className="flex-1 flex min-h-0 bg-white">
          {isGestor && (
            <ConversasList
              selectedId={colaboradorId}
              onSelect={handleSelect}
              liveUpdate={liveUpdate}
              onConversaResolved={setSelectedNome}
            />
          )}
          <ChatWindow
            colaboradorId={colaboradorId}
            colaboradorNome={colaboradorNome}
            onLobbyUpdate={isGestor ? setLiveUpdate : undefined}
          />
        </div>
      </div>
    </div>
  );
}
