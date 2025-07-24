import React, { useContext } from "react";
import Login from './features/Auth/login';
import { Routes, Route, useNavigate } from "react-router-dom";
import SelecionarPdf from "./pages/selectPdf";
import TablePage from "./components/tabelaPDF"; 
import { UserContext } from "./context/userContext";
import './App.css';

function App() {
  const navigate = useNavigate();
  const { setUsername, setUserEmail } = useContext(UserContext);

  const handleLoginSuccess = (userData) => {
    
    setUsername(userData.nome);
    setUserEmail(userData.email);

    navigate("/superadmin");
  };

  return (
      <Routes>
        <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/home" element={<SelecionarPdf />} />
        <Route path="/superadmin" element={<SelecionarPdf />} />
        <Route path="/superadmin/:filename" element={<TablePage />} />
        <Route path="/table/:filename" element={<TablePage />} />
      </Routes>
  );
};

export default App;