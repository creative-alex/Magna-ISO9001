import React from "react";
import { useNavigate } from "react-router-dom";
import userAddIcon from "../../icons/user_add.ico";

const AddUserButton = () => {
  const navigate = useNavigate();

  const handleAddUser = () => {
    navigate('/create-user');
  };

  return (
    <button className="createUser-button" onClick={handleAddUser}>
      <img 
        src={userAddIcon} 
        alt="Adicionar Utilizador" 
        style={{ width: '16px', height: '16px', marginRight: '5px' }} 
        title="Adicionar Utilizador"
        
      />
    </button>
  );
};

export default AddUserButton;
