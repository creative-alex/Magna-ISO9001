import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import { AllEntities } from '../../components/TimeTracking/Admin/entities/allEntities';
import LoadingSpinner from '../../components/TimeTracking/Shared/loadingSpinner';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const EntitiesPage = () => {
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
        <Topbar icon="🏢" title="Entidades" />
        <AllEntities />
      </div>
    </div>
  );
};

export default EntitiesPage;
