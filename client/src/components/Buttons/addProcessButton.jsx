import React from "react";
import { useNavigate } from "react-router-dom";
import fileAddIcon from "../../icons/file_add.ico"

const AddProcessButton = () => {
  const navigate = useNavigate();

  const handleAddProcess = () => {
    navigate('/create-process');
  };

  return (
    <button className="createUser-button" onClick={handleAddProcess}>
      <img 
        src={fileAddIcon} 
        alt="Adicionar Processo" 
        style={{ width: '16px', height: '16px', marginRight: '5px' }} 
        title="Adicionar Processo"
      />
    </button>
  );
};

export default AddProcessButton;
