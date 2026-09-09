import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../shared/context/userContext';
import * as Client from '../components/Client';
import LoadingSpinner from '../components/Shared/loadingSpinner';
import Sidebar from '../../../shared/components/Sidebar';
import Topbar from '../../../shared/components/Topbar';

const RegistosPage = () => {
  const { username } = useContext(UserContext);
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const reloadRegistos = () => setRefreshKey(k => k + 1);

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

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-0">
        <Topbar icon="🕐" title="Registos" />

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[160px]">
                  <Client.EntryRegisterButton key={refreshKey} username={username} fontSize="0.85rem" buttonHeight="46px" onSuccess={reloadRegistos} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Client.ExitRegisterButton key={refreshKey} username={username} fontSize="0.85rem" buttonHeight="46px" onSuccess={reloadRegistos} />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <Client.PontoTable key={refreshKey} className="overflow-x-auto" username={username} onCompensated={reloadRegistos} />
              </div>
            </div>

            <Client.TotalSummary key={refreshKey} username={username} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default RegistosPage;
