import React, { useState, useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { sendPasswordResetEmail } from "firebase/auth";
import Logo from "../../logo.svg";

const ForgotPassword = () => {
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { auth } = useContext(UserContext);
  const navigate = useNavigate();

  // Função para enviar email de reset de password
  const handlePasswordReset = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      if (!resetEmail.trim()) {
        throw new Error("Por favor, insira o seu email.");
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resetEmail)) {
        throw new Error("Por favor, insira um email válido.");
      }

      await sendPasswordResetEmail(auth, resetEmail);
      
      toast.success("Email de recuperação enviado! Verifique a sua caixa de entrada.");
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
      
    } catch (error) {
      console.error("Erro ao enviar email de reset:", error);
      
      // Traduzir erros do Firebase
      let errorMessage = "Erro ao enviar email de recuperação.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "Não existe uma conta associada a este email.";
          break;
        case 'auth/invalid-email':
          errorMessage = "O formato do email não é válido.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Erro de conexão. Verifique a sua ligação à internet.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-container">
      <div className="header">
        <img src={Logo} alt="Logo" className="logo" />
        <h2 className="title">Magna ISO9001</h2>
      </div>
      <div className="file-panel">
        <div className="panel-title">Recuperar Senha</div>
        
        <form className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email:</label>
            <input
              type="email"
              placeholder="Insira o seu email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="auth-input"
            />
          </div>
          
          <button 
            type="button" 
            className="auth-button" 
            onClick={handlePasswordReset}
            disabled={loading}
            style={{ 
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
          </button>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={() => navigate("/")}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Voltar ao Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;