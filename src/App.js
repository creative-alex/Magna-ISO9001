import React, { useContext } from "react";
import Login from './components/Auth/login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/Dashboard";
import TablePage from "./components/EditorProcedimentos"; 
import CreateProcess from "./pages/novoProcesso";
import CreateProcedimento from "./pages/novoProcedimento";
import Register from "./components/Auth/register";
import { UserContext } from "./context/userContext";
import { TutorialProvider } from "./context/tutorialContext";
import NewTable from "./pages/novoProcedimento"
import Perfil from "./pages/Perfil"
import RegistoNaoConformidade from "./pages/RegistoNaoConformidade";
import FirstLogin from "./components/Auth/firstLogin";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const navigate = useNavigate();
  const { setUsername, setUserEmail, setUserRole, setIsAuthenticated, isAuthenticated } = useContext(UserContext);

  const handleLoginSuccess = (userData) => {
    setUsername(userData.nome);
    setUserEmail(userData.email);
    setUserRole(userData.role);
    setIsAuthenticated(true);
    navigate("/file");
  };

  return (
    <TutorialProvider>
      <Routes>
        {/* Rota pública de login */}
        <Route
          path="/"
          element={
            isAuthenticated ?
              <Navigate to="/file" replace /> :
              <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        
        {/* Rotas protegidas */}
        <Route
          path="/file"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/file/:filename" 
          element={
            <ProtectedRoute>
              <TablePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/table/:filename" 
          element={
            <ProtectedRoute>
              <TablePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/novo-procedimento" 
          element={
            <ProtectedRoute>
              <CreateProcedimento />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-user" 
          element={
            <ProtectedRoute>
              <Register />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/novo-processo"
          element={
            <ProtectedRoute>
              <CreateProcess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/newtable"
          element={
            <ProtectedRoute>
              <NewTable />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nao-conformidade"
          element={
            <ProtectedRoute>
              <RegistoNaoConformidade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/first-login"
          element={<FirstLogin mode="firstLogin" />}
        />
        <Route
          path="/reset-password"
          element={<FirstLogin mode="reset" />}
        />
        <Route 
          path="/forgot-password"
          element={<FirstLogin mode="forgot" />}
        />
      </Routes>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </TutorialProvider>
  );
};

export default App;
