import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa6";

const AddUserButton = () => {
  const navigate = useNavigate();

  const handleAddUser = () => {
    navigate('/create-user');
  };

  return (
    <button className="bg-transparent text-[#7A5010] border border-[#E8D0A0] px-[14px] py-[7px] text-[13px] font-semibold cursor-pointer rounded-md transition-all duration-200 whitespace-nowrap hover:bg-[#F0E2C4] hover:-translate-y-px" onClick={handleAddUser}>
      <FaUserPlus size={16} style={{ marginRight: '5px' }} title="Adicionar Utilizador" />
    </button>
  );
};

export default AddUserButton;
