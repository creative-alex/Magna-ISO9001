import React, { useState, useContext, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../context/userContext";
import LoadingPage from "../../pages/loading";
import FirstLoginComponent from "./firstLogin";
import Logo from "../../logo.svg";
import { API_CONFIG } from "../../utils/constants";

const Login = ({onLoginSuccess}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { auth, isAuthenticated, setUserEmail } = useContext(UserContext);
    const hasShownToast = useRef(false); // Prevenir múltiplos toasts
    const isLoginInProgress = useRef(false); // Prevenir re-execução do login
    
    // Função para traduzir erros do Firebase para mensagens amigáveis
    const getFirebaseErrorMessage = (error) => {
        const errorCode = error.code;
        
        switch (errorCode) {
            case 'auth/invalid-credential':
                return 'Email ou senha incorretos. Verifique os seus dados e tente novamente.';
            case 'auth/user-not-found':
                return 'Não existe uma conta associada a este email.';
            case 'auth/wrong-password':
                return 'Senha incorreta. Verifique a sua senha e tente novamente.';
            case 'auth/invalid-email':
                return 'O formato do email não é válido.';
            case 'auth/user-disabled':
                return 'Esta conta foi desactivada. Contacte o administrador.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas de login falhadas. Tente novamente mais tarde.';
            case 'auth/network-request-failed':
                return 'Erro de conexão. Verifique a sua ligação à internet.';
            case 'auth/invalid-login-credentials':
                return 'Credenciais de login inválidas. Verifique o email e senha.';
            default:
                return 'Erro ao fazer login. Verifique os seus dados e tente novamente.';
        }
    };
    
    // Reset do componente quando o usuário faz logout
    useEffect(() => {
        if (!isAuthenticated) {
            hasShownToast.current = false;
            isLoginInProgress.current = false;
            setEmail("");
            setPassword("");
            setError("");
            setLoading(false);
        }
    }, [isAuthenticated]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Verificar se já está carregando para evitar submissões duplas
        if (loading || isLoginInProgress.current) {
            return;
        }
        
        isLoginInProgress.current = true;
        setLoading(true);
        setError("");
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Forçar refresh do token para garantir que está atualizado
            const token = await user.getIdToken(true);
            
            console.log("🔐 Token gerado:", token.substring(0, 50) + "...");
            console.log("👤 User UID:", user.uid);
            
                        const response = await fetch("https://api9001.duckdns.org/users/verifyTokenAndGetUserInfo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`, // Adicionar header Authorization
                },
                body: JSON.stringify({ token }),
            });
            
            const data = await response.json();
            console.log("📥 Resposta da API:", response.status, data);
            
            if (response.ok) {
                // Verificar se é o primeiro login
                if (data.isFirstLogin) {
                    console.log("✅ É primeiro login! Redirecionando para /first-login...");
                    setLoading(false);
                    isLoginInProgress.current = false;
                    
                    // Guardar email no contexto para o first login
                    setUserEmail(data.email);
                    
                    // Redirecionar para a página de first login
                    navigate("/first-login", { replace: true });
                    return; // Não continuar com o login normal
                } else {
                    console.log("❌ NÃO é primeiro login, continuando login normal...");
                }
                
                // Login bem-sucedido - só mostrar toast se foi um login real, não um redirecionamento
                if (!hasShownToast.current) {
                    hasShownToast.current = true;
                    toast.success("Login bem-sucedido!");
                }
                
                onLoginSuccess(data);
                const redirectPath = location.state?.from?.pathname || "/file";
                navigate(redirectPath, { replace: true });
            } else {
                setError(data.message || "Erro ao verificar token");
                toast.error("Erro ao verificar token");
                // Se o token não for válido, fazer logout do Firebase
                await auth.signOut();
            }
        }
        catch (error) {
            console.error("Erro no login:", error);
            const friendlyErrorMessage = getFirebaseErrorMessage(error);
            setError(friendlyErrorMessage);
            toast.error(friendlyErrorMessage);
        }
        finally {
            setLoading(false);
            isLoginInProgress.current = false;
        }
    }

    console.log("🎯 Mostrando login normal");
    return (
        <>
            {loading ? (
                <LoadingPage />
            ) : (
                <div className="file-container">
                    <div className="header">
                        <img src={Logo} alt="Logo" className="logo" />
                        <h2 className="title">Magna ISO90001</h2>
                    </div>
                    <div className="file-panel">
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-field">
                                <label className="auth-label">Email:</label>
                                <input
                                    type="email"
                                    className="auth-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label className="auth-label">Senha:</label>
                                <input
                                    type="password"
                                    className="auth-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className="auth-error">{error}</div>}
                            <button type="submit" className="auth-button" disabled={loading}>
                                Entrar
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </>
    );
}

export default Login;
