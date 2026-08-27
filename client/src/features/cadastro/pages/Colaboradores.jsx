import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../shared/context/userContext";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../../shared/components/ColaboradoresGroupedList";

export default function Colaboradores() {
  const navigate = useNavigate();
  const { nivelAcesso } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const canView = isAdmin || isHR || isAdministrador;

  useEffect(() => {
    if (!canView) {
      navigate("/cadastro", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!canView) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="🪪" title="Cadastro" />
        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher a respetiva ficha de cadastro."
          onSelect={(c) => navigate(`/cadastro/${c.id}`, { state: { nome: c.nome, email: c.email } })}
        />
      </div>
    </div>
  );
}
