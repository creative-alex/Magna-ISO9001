import { createContext, useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import LoadingPage from "../pages/loading";
import { API_CONFIG } from "../utils/constants";

// Configuração do Firebase
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

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

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
        setUsername(userData.nome);
        setUserEmail(userData.email);
        setUserRole(userData.role);
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
    setUserEmail("");
    setUserRole(null);
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
    userEmail,
    setUserEmail,
    userRole,
    setUserRole,
    isAuthenticated,
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
