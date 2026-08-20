import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import LoadingPage from "../pages/loading";
import { API_CONFIG } from "../utils/constants";
import { auth } from "../utils/firebase";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [uid, setUid] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [nivelAcesso, setNivelAcesso] = useState(null);

  // Função para verificar e validar o token do utilizador
  const validateUserToken = async (user) => {
    try {
      // Forçar refresh do token para garantir que está atualizado
      const token = await user.getIdToken(true);
      
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USERS}/verifyTokenAndGetUserInfo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Adicionar header Authorization
        },
        body: JSON.stringify({ token }),
      });
      
      
      if (response.ok) {
        const userData = await response.json();

        if (userData.isFirstLogin) {
          // Não autenticar — login.jsx redireciona para /reset-password
          return false;
        }

        setUsername(userData.nome);
        setUid(userData.uid);
        setUserEmail(userData.email);
        setUserRole(userData.role);
        setNivelAcesso(userData.nivelAcesso);
        setIsAuthenticated(true);
        return true;
      } else {
        // Token inválido
        clearUserData();
        return false;
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      clearUserData();
      return false;
    }
  };

  // Função para limpar dados do utilizador
  const clearUserData = () => {
    setUsername(null);
    setUid(null);
    setUserEmail("");
    setUserRole(null);
    setNivelAcesso(null);
    setIsAuthenticated(false);
  };

  // Função para logout
  const logout = async () => {
    try {
      await auth.signOut();
      clearUserData();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  useEffect(() => {
    // Observa mudanças no estado de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      
      if (user) {
        // Utilizador está logado, verificar se o token é válido
        const isValid = await validateUserToken(user);
        if (!isValid) {
          // Se o token não for válido, fazer logout
          await auth.signOut();
        }
      } else {
        // Utilizador não está logado
        clearUserData();
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    username,
    setUsername,
    uid,
    setUid,
    userEmail,
    setUserEmail,
    userRole,
    setUserRole,
    nivelAcesso,
    setNivelAcesso,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    logout,
    validateUserToken,
    auth
  };

  // Mostrar página de loading enquanto verifica autenticação
  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
