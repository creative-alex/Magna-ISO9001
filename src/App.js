import React, { useContext } from "react";
import Login from './components/Auth/login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { Routes, Route, useNavigate } from "react-router-dom";
import SelecionarPdf from "./pages/selectPdf";
import TablePage from "./components/EditorProcedimentos"; 
import CreateProcess from "./pages/novoProcesso";
import CreateProcedimento from "./pages/novoProcedimento";
import Register from "./components/Auth/register";
import { UserContext } from "./context/userContext";
import { TutorialProvider } from "./context/tutorialContext";
import NewTable from "./pages/novoProcedimento"
import FirstLogin from "./components/Auth/firstLogin";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const navigate = useNavigate();
  const { setUsername, setUserEmail, setUserRole, isAuthenticated } = useContext(UserContext);

  const handleLoginSuccess = (userData) => {
    setUsername(userData.nome);
    setUserEmail(userData.email);
    setUserRole(userData.role);
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
              <SelecionarPdf /> : 
              <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />
        
        {/* Rotas protegidas */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <SelecionarPdf />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/file" 
          element={
            <ProtectedRoute>
              <SelecionarPdf />
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
          path="/first-login"
          element={<FirstLogin />}
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
