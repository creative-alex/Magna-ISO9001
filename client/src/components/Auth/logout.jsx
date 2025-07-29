import React from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

const Logout = ({ onLogout }) => {
  const auth = getAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      
      // Limpar dados locais
      localStorage.removeItem("user");
      
      // Chamar callback se fornecido
      if (onLogout) {
        onLogout();
      }
      
      toast.success("Logout realizado com sucesso!");
      navigate("/", { replace: true });
      
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout: " + error.message);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn logout-btn"
      style={{
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Sair
    </button>
  );
};

export default Logout;
