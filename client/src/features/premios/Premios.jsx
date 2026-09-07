import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../shared/components/ColaboradoresGroupedList";

export default function Premios() {
  const navigate = useNavigate();
  const { uid, nivelAcesso } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isAdministrador = nivelAcesso === "Administrador";
  const isGestorFinanceiro = nivelAcesso === "GestorFinanceiro";
  const canView = isAdmin || isAdministrador || isGestorFinanceiro;

  useEffect(() => {
    // Esta página (lista de colaboradores) é só para admin/Administrador/Gestor
    // Financeiro; GestorRH (só consulta os seus próprios prémios, ver canRead no
    // backend) e um colaborador comum veem antes os seus próprios prémios.
    if (!canView) {
      navigate(`/premios/${uid}`, { replace: true });
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

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🏆" title="Prémios" />
        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher os respetivos prémios."
          onSelect={(c) => navigate(`/premios/${c.id}`, { state: { nome: c.nome, email: c.email } })}
        />
      </div>
    </div>
  );
}
