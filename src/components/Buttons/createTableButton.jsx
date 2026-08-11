import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from "react-icons/fa6";

export default function CreateTableButton({ folderName, currentPath = [], size = 16, className }) {
  const navigate = useNavigate();

  const handleCreateTable = (e) => {
    e.stopPropagation(); // Impede que o clique expanda/contraia a pasta
    
    // Constrói o caminho completo da pasta
    const fullPath = [...currentPath, folderName].join('/');

    // Navega para novoProcedimento com a pasta pré-selecionada
    navigate('/novo-procedimento', { 
      state: { 
        preselectedFolder: fullPath 
      } 
    });
  };

  return (
    <button
      onClick={handleCreateTable}
      className={className ?? "bg-transparent text-[#7A5010] border border-[#E8D0A0] px-2 py-1.5 text-xs cursor-pointer rounded inline-flex items-center gap-[5px] transition-colors duration-200 whitespace-nowrap font-medium mr-2 hover:bg-[#F0E2C4]"}
      title="Criar novo procedimento"
    >
        <FaPlus size={size} />
    </button>
  );
}
