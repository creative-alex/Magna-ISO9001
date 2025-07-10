import React from "react";
import Login from './features/Auth/login';
import { Routes, Route, useNavigate } from "react-router-dom";
import SelecionarPdf from "./pages/selectPdf";
import TablePage from "./components/tabelaPDF"; 
import './App.css';

function App() {
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    console.log("Login bem-sucedido! Dados do utilizador:", userData);
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