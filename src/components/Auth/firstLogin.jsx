import React, { useState, useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoutButton from "./logout";
import Logo from "../../logo.svg";
import { APP_CONSTANTS } from "../../utils/constants";

const FirstLoginComponent = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { userEmail } = useContext(UserContext);
  const navigate = useNavigate();

  // Validações em tempo real
  const isPasswordValid = newPassword.length >= APP_CONSTANTS.MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handlePasswordChange = async () => {
    // Verificar se já está a processar
    if (loading) return;
    
    setLoading(true);
    
    // Limpar erros anteriores
    try {
      // Validações
      if (!userEmail) {
        throw new Error("Erro: colaborador não encontrado.");
      }
  
      if (!newPassword.trim()) {
        throw new Error("Por favor, insira uma nova senha.");
      }

      if (newPassword.length < APP_CONSTANTS.MIN_PASSWORD_LENGTH) {
        throw new Error(`A senha deve ter pelo menos ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} caracteres.`);
      }

      if (!confirmPassword.trim()) {
        throw new Error("Por favor, confirme a nova senha.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }

      const response = await fetch(`https://api-iso-9001.onrender.com/users/update-first-login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          userEmail, 
          newPassword,
          isFirstLogin: false // ✅ Definir como false após alterar senha
        }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao atualizar senha");
  
      // Exibe uma mensagem de sucesso
      toast.success("Senha alterada com sucesso!");
  
      // Limpar dados do localStorage e redirecionar
      setTimeout(() => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        
        if (onComplete) {
          onComplete();
        } else {
          // Redirecionar para página de login e terminar sessão
          navigate("/");
          
        }
      }, 2000); // 2 segundos de atraso
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-container">
      <div className="header">
        <img src={Logo} alt="Logo" className="logo" />
        <h2 className="title">Magna ISO90001</h2>
      </div>
      <div className="file-panel">
        <div className="panel-title">Alterar Senha</div>
        <form className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Nova Senha:</label>
            <input
              type="password"
              placeholder="Nova Senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="auth-input"
            />
            
            {/* Indicadores de validação da senha */}
            {newPassword && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <div style={{ color: isPasswordValid ? 'green' : 'red' }}>
                  {isPasswordValid ? '✅' : '❌'} Pelo menos {APP_CONSTANTS.MIN_PASSWORD_LENGTH} caracteres
                </div>
              </div>
            )}
          </div>
          
          <div className="auth-field">
            <label className="auth-label">Confirme a Nova Senha:</label>
            <input
              type="password"
              placeholder="Confirme a Nova Senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
            />
            
            {/* Indicador de confirmação */}
            {confirmPassword && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <div style={{ color: passwordsMatch ? 'green' : 'red' }}>
                  {passwordsMatch ? '✅ Senhas coincidem' : '❌ Senhas não coincidem'}
                </div>
              </div>
            )}
          </div>
          
          <button 
            type="button" 
            className="auth-button" 
            onClick={handlePasswordChange}
            disabled={loading || !isPasswordValid || !passwordsMatch}
            style={{ 
              opacity: (loading || !isPasswordValid || !passwordsMatch) ? 0.6 : 1,
              cursor: (loading || !isPasswordValid || !passwordsMatch) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </button>
        </form>
      </div>

    </div>
  );
};

export default FirstLoginComponent;
