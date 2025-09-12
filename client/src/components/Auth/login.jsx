import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { UserContext } from "../../context/userContext";
import LoadingPage from "../../pages/loading";
import FirstLoginComponent from "./firstLogin";

const Login = ({onLoginSuccess}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { auth } = useContext(UserContext);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const token = await user.getIdToken();
            
            const response = await fetch("http://192.168.1.219:8080/users/verifyTokenAndGetUserInfo", {
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
                    return; // Não continuar com o login normal
                }
                
                onLoginSuccess(data);
                toast.success("Login bem-sucedido!");
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
        }
    }

    const handleFirstLoginComplete = () => {
        setIsFirstLogin(false);
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
                <div className="auth-container">
                    <h2 className="auth-title">Login</h2>
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
            )}
            <ToastContainer />
        </>
    );
}

export default Login;
