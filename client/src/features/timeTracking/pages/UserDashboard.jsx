import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import * as Client from '../../components/TimeTracking/Client';
import LoadingSpinner from '../../components/TimeTracking/Shared/loadingSpinner';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import capa from '../../assets/timeTracking/capa.jpg';
import footer from '../../assets/timeTracking/footer.png';

const UserDashboard = () => {
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
        <Topbar icon="🕐" title="Livro de Ponto" />

        <div className="relative overflow-hidden flex-1 min-h-0">
          <img
            src={capa}
            alt="Capa"
            className="absolute top-0 left-0 w-[15vw] h-full max-w-[30%] bg-gold-light shadow transition-all duration-300 z-[-1] object-cover pointer-events-none max-[900px]:w-[35vw] max-[900px]:max-w-none max-[600px]:w-[30vw] max-[600px]:max-w-none max-[600px]:object-cover"
          />

          <div className="absolute top-[38%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 md:gap-8 w-[70%] md:w-auto p-1 md:p-0">
            <button
              className="text-[1.5vw] bg-transparent text-gold border-2 border-gold rounded-full h-[8vh] w-full cursor-pointer hover:bg-gold hover:text-white bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md md:w-[800px] max-w-full text-sm md:text-base py-2 md:py-4"
              onClick={() => navigate('/ponto/registos')}
            >
              Mostrar Registos
            </button>

            <div className="flex flex-row gap-1 md:gap-4 w-full">
              <div className="flex-1 w-full">
                <Client.EntryRegisterButton username={username} fontSize="0.85rem" buttonHeight='8vh' />
              </div>
              <div className="flex-1 w-full">
                <Client.ExitRegisterButton username={username} fontSize="0.85rem" buttonHeight='8vh' />
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-[1] flex justify-center pointer-events-none">
            <img src={footer} alt="Footer" className="h-[80px] md:h-[150px] object-contain w-auto"/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
