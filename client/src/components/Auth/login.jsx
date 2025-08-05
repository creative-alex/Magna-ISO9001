import React, { useState, useEffect, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

// Configuração do Firebase usando variáveis do .env
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const Login = ({onLoginSuccess}) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();


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
                onLoginSuccess(data);
                toast.success("Login bem-sucedido!");
                const redirectPath = location.state?.from || "/home";
                navigate(redirectPath, { replace: true });
            } else {
                setError(data.message || "Erro ao verificar token");
                toast.error("Erro ao verificar token");
            }
        }
        catch (error) {
            setError("Erro ao fazer login: " + error.message);
            toast.error("Erro ao fazer login: " + error.message);
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <>
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
        <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
        </button>
    </form>
</div>

            <ToastContainer />
        </>

    );
}
export default Login;
