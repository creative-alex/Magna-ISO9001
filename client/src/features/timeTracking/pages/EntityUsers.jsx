import React, { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../../shared/context/userContext';
import Entity from '../components/Admin/entities/Entity';
import EntityUserList from '../components/Admin/entities/entityUserList';
import LoadingSpinner from '../components/Shared/loadingSpinner';
import Sidebar from '../../../shared/components/Sidebar';
import Topbar from '../../../shared/components/Topbar';

const EntityUsersPage = () => {
  const { id_entidade } = useParams();
  const { username } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!username) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🏢" title="Entidade" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <Entity />
          <EntityUserList entityName={id_entidade} />
        </div>
      </div>
    </div>
  );
};

export default EntityUsersPage;
