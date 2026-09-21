import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../shared/components/ColaboradoresGroupedList";
import { usePermissions } from "../../shared/hooks/usePermissions";

export default function MedicinaTrabalho() {
  const navigate = useNavigate();
  const { uid } = useContext(UserContext);
  const { canManageUsers: canView } = usePermissions();

  useEffect(() => {
    // Esta página (lista de colaboradores) é só para admin/RH/Administrador; um
    // colaborador comum vê antes a sua própria medicina do trabalho.
    if (!canView) {
      navigate(`/medicina-trabalho/${uid}`, { replace: true });
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
        <Topbar icon="🩺" title="Medicina do Trabalho" />
        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher a respetiva medicina do trabalho."
          onSelect={(c) => navigate(`/medicina-trabalho/${c.id}`, { state: { nome: c.nome, email: c.email } })}
        />
      </div>
    </div>
  );
}
