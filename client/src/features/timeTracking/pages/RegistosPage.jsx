import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import * as Client from '../../components/TimeTracking/Client';
import LoadingSpinner from '../../components/TimeTracking/Shared/loadingSpinner';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import capa from '../../assets/timeTracking/capa.jpg';

const RegistosPage = () => {
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

      <div className="ml-[230px] flex-1 flex flex-col min-h-0">
        <Topbar icon="🕐" title="Registos" />

        <main className="relative overflow-hidden flex-1 min-h-0">
          <img
            src={capa}
            alt="Capa"
            className="absolute top-0 left-0 z-[-1] w-[15vw] h-full max-w-[30%] max-[900px]:max-w-none bg-[#f7e5c2] shadow transition-all duration-300 object-cover pointer-events-none"
          />

          {/* Desktop */}
          <div className="hidden md:flex relative z-10" style={{ gap: '1rem', marginLeft: '22rem', padding: '1rem', width: '100%', maxWidth: '600px', height: '4vh' }}>
            <div style={{ transformOrigin: 'center', flex: 1 }}>
              <Client.EntryRegisterButton username={username} fontSize="0.85rem" buttonHeight="4vh" />
            </div>
            <div style={{ transformOrigin: 'center', flex: 1 }}>
              <Client.ExitRegisterButton username={username} fontSize="0.85rem" buttonHeight="4vh" />
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden justify-center items-center relative z-10" style={{ gap: '0.75rem', padding: '0.75rem', paddingLeft: '4rem', width: '100%' }}>
            <div style={{ width: '150px' }}>
              <Client.EntryRegisterButton username={username} fontSize="0.8rem" buttonHeight="5vh" />
            </div>
            <div style={{ width: '150px' }}>
              <Client.ExitRegisterButton username={username} fontSize="0.8rem" buttonHeight="5vh" />
            </div>
          </div>

          <Client.TotalSummary username={username} />

          <Client.PontoTable
            className="overflow-x-auto max-w-[85vw] my-[50px] mx-auto h-[85vh] w-[43vw] overflow-y-scroll max-[900px]:w-[42vw] max-[600px]:w-[75vw] max-[600px]:h-[65vh] absolute top-[5%] left-[20%]"
            username={username}
          />
        </main>
      </div>
    </div>
  );
};

export default RegistosPage;
