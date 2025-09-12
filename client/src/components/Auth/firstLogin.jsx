import React, { useState, useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoutButton from "./logout";const FirstLoginComponent = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { userEmail } = useContext(UserContext);
  const navigate = useNavigate();

  const handlePasswordChange = async () => {
    try {
      if (!userEmail) {
        throw new Error("Erro: colaborador não encontrado.");
      }
  
      if (newPassword.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }
  
      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }
  
      const response = await fetch(`http://localhost:3001/auth/update-first-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, newPassword }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao atualizar senha");
  
      // Exibe uma mensagem de sucesso
      toast.success("Senha alterada com sucesso! Faça login novamente.");
  
      // Adiciona um atraso antes de chamar onComplete
      setTimeout(() => {
        // Remove o colaborador do localStorage
        localStorage.removeItem("user");
        // Chama a função onComplete se fornecida
        if (onComplete) {
          onComplete();
        } else {
          navigate("/");
        }
      }, 3000); // 3 segundos de atraso
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <>
    <div className="form-container center gradient-border">
      <ToastContainer position="top-center" autoClose={3000} /> 
      <h2>Alterar Senha</h2>
      <input
        type="password"
        placeholder="Nova Senha"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="form-input"
      />
      <input
        type="password"
        placeholder="Confirme a Nova Senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="form-input"
        style={{ marginTop: "10px" }}
      />
      <button className="btn" style={{ marginTop: "10px" }} onClick={handlePasswordChange}>
        Confirmar
      </button>
    </div>
    </>
  );
};

export default FirstLoginComponent;