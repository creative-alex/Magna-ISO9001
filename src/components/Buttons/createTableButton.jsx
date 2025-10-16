import React from 'react';
import { useNavigate } from 'react-router-dom';
import newFileIcon from "../../icons/plus.ico"; // Import your icon here
import "../../index.css"; 

export default function CreateTableButton({ folderName, currentPath = [] }) {
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
      className="create-table-btn"
      title="Criar novo procedimento"
    >
        <img 
            src={newFileIcon} 
            alt="Guardar documento" 
            style={{ width: '16px', height: '16px' }} 
        />
    </button>
  );
}
