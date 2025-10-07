import React, { useState, useContext, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../context/userContext";
import LoadingPage from "../../pages/loading";
import FirstLoginComponent from "./firstLogin";
import Logo from "../../logo.svg";

const Login = ({onLoginSuccess}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { auth, isAuthenticated } = useContext(UserContext);
    const hasShownToast = useRef(false); // Prevenir múltiplos toasts
    const isLoginInProgress = useRef(false); // Prevenir re-execução do login
    
    // Reset do componente quando o usuário faz logout
    useEffect(() => {
        if (!isAuthenticated) {
            hasShownToast.current = false;
            isLoginInProgress.current = false;
            setEmail("");
            setPassword("");
            setError("");
            setLoading(false);
            setIsFirstLogin(false);
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
            const token = await user.getIdToken();
            
            const response = await fetch("https://api9001.duckdns.org/users/verifyTokenAndGetUserInfo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });
            
            const data = await response.json();
            if (response.ok) {
                // Verificar se é o primeiro login
                if (data.isFirstLogin) {
                    setIsFirstLogin(true);
                    setLoading(false);
                    isLoginInProgress.current = false;
                    return; // Não continuar com o login normal
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
            setError("Erro ao fazer login: " + error.message);
            toast.error("Erro ao fazer login: " + error.message);
        }
        finally {
            setLoading(false);
            isLoginInProgress.current = false;
        }
    }

    const handleFirstLoginComplete = () => {
        setIsFirstLogin(false);
        hasShownToast.current = false; // Reset toast flag
        isLoginInProgress.current = false; // Reset login flag
        // Redirecionar para a página de login novamente
        toast.success("Senha alterada com sucesso! Faça login novamente.");
    };

    // Se for primeiro login, mostrar o componente FirstLogin
    if (isFirstLogin) {
        return <FirstLoginComponent onComplete={handleFirstLoginComplete} />;
    }

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
