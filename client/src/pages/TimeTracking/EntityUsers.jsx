import React, { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import Entity from '../../components/TimeTracking/Admin/entities/Entity';
import EntityUserList from '../../components/TimeTracking/Admin/entities/entityUserList';
import LoadingSpinner from '../../components/TimeTracking/Shared/loadingSpinner';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

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

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
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
