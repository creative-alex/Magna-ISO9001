import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import LogoutButton from "./logout";
import Logo from "../../logo.svg";
import { APP_CONSTANTS } from "../../utils/constants";


const FirstLoginComponent = ({ onComplete, mode = "firstLogin" }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState(null);
  const [isValidResetCode, setIsValidResetCode] = useState(false);
  const { userEmail, auth } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determinar se é modo reset ou first login
  const isResetMode = mode === "reset" || searchParams.get("mode") === "reset" || searchParams.get("oobCode");
  const isFirstLogin = mode === "firstLogin" || !isResetMode;

  // Verificar código de reset quando a página carrega (modo reset)
  useEffect(() => {
    const checkResetCode = async () => {
      if (isResetMode) {
        const oobCode = searchParams.get("oobCode");
        if (oobCode) {
          setLoading(true);
          try {
            // Verificar se o código de reset é válido
            await verifyPasswordResetCode(auth, oobCode);
            setResetCode(oobCode);
            setIsValidResetCode(true);
          } catch (error) {
            console.error("Código de reset inválido:", error);
            
            let errorMessage = "Código de recuperação inválido ou expirado.";
            switch (error.code) {
              case 'auth/invalid-action-code':
                errorMessage = "O link de recuperação é inválido ou já foi usado.";
                break;
              case 'auth/expired-action-code':
                errorMessage = "O link de recuperação expirou. Solicite um novo.";
                break;
              default:
                errorMessage = "Erro ao verificar o código de recuperação.";
            }
            
            toast.error(errorMessage);
            
            // Redirecionar para login após erro
            setTimeout(() => {
              navigate("/", { replace: true });
            }, 3000);
          } finally {
            setLoading(false);
          }
        } else {
          toast.error("Código de recuperação não encontrado.");
          navigate("/", { replace: true });
        }
      }
    };

    checkResetCode();
  }, [isResetMode, searchParams, auth, navigate]);

  // Função para confirmar reset de password
  const handleFirebasePasswordReset = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
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

      if (!resetCode) {
        throw new Error("Código de recuperação não encontrado.");
      }

      // Confirmar reset de password no Firebase
      await confirmPasswordReset(auth, resetCode, newPassword);
      
      toast.success("Senha alterada com sucesso! Pode agora fazer login.");
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      
      let errorMessage = "Erro ao alterar senha.";
      
      switch (error.code) {
        case 'auth/invalid-action-code':
          errorMessage = "O código de recuperação é inválido ou já foi usado.";
          break;
        case 'auth/expired-action-code':
          errorMessage = "O código de recuperação expirou.";
          break;
        case 'auth/weak-password':
          errorMessage = "A senha é muito fraca. Use uma senha mais forte.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
      if (!isFirstLogin) {
        throw new Error("Esta funcionalidade só está disponível para primeiro login.");
      }
      
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
        <h2 className="title">Magna ISO9001</h2>
      </div>
      <div className="file-panel">
        <div className="panel-title">
          {isResetMode ? "Definir Nova Senha" : "Alterar Senha"}
        </div>
        
        {isResetMode && !isValidResetCode ? (
          // Verificando código de reset
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px' }}>
              {loading ? (
                <div>
                  <div>Verificando código de recuperação...</div>
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Aguarde um momento
                  </div>
                </div>
              ) : (
                <div>
                  <div>Código de recuperação inválido</div>
                  <div style={{ marginTop: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => navigate("/")}
                      className="auth-button"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Formulário de alteração de senha (first login ou reset confirmado)
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
              onClick={isResetMode ? handleFirebasePasswordReset : handlePasswordChange}
              disabled={loading || !isPasswordValid || !passwordsMatch}
              style={{ 
                opacity: (loading || !isPasswordValid || !passwordsMatch) ? 0.6 : 1,
                cursor: (loading || !isPasswordValid || !passwordsMatch) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Processando...' : 'Confirmar Nova Senha'}
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
        )}
      </div>
    </div>
  );
};

export default FirstLoginComponent;
