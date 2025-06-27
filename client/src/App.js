import React from "react";
import Login from './features/Auth/login';
import { ToastContainer } from 'react-toastify';
import { Routes, Route, useNavigate, BrowserRouter as Router } from "react-router-dom";
import SelecionarPdf from "./pages/selectPdf";
import TablePage from "./pages/tablePage";
import TablePageTemplate2 from "./pages/tablePageTemplate2";
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
        <Route path="/table2/:filename" element={<TablePageTemplate2 />} />
      </Routes>
  );
};

export default App;