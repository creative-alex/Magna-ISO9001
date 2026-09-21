import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../../shared/components/ColaboradoresGroupedList";
import NotifySemNifButton from "../components/NotifySemNifButton";
import { usePermissions } from "../../../shared/hooks/usePermissions";

export default function Colaboradores() {
  const navigate = useNavigate();
  // Mesmo âmbito de requireCanViewColaboradores no backend (GET /users/getColaboradores) -
  // um GestorFinanceiro também precisa de chegar aqui para poder consultar o Cadastro de
  // outros colaboradores (ver canViewCadastro em usePermissions.js), mesmo sem poder editá-lo.
  const { canViewColaboradores: canView, canManageUsers } = usePermissions();

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

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🪪" title="Cadastro" />
        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher a respetiva ficha de cadastro."
          onSelect={(c) => navigate(`/cadastro/${c.id}`, { state: { nome: c.nome, email: c.email } })}
          showStatusHoje
          includeInactive
          renderGroupExtra={
            canManageUsers
              ? (entidade, membros) => {
                  // Administradores não contam - o aviso é dirigido aos colaboradores da
                  // entidade, não a quem a gere (mesmo critério do backend, ver
                  // notifyEntidadeSemNif em cadastroController.js).
                  const semNif = membros.filter((m) => !m.temNif && m.nivelAcesso !== "Administrador").length;
                  return semNif > 0 ? <NotifySemNifButton entidade={entidade} count={semNif} /> : null;
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
