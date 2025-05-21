import React from "react";
import Login from './features/Auth/login';
import { ToastContainer } from 'react-toastify';
import { Routes, Route, useNavigate } from "react-router-dom";
import PDFEditorFromBackend from "./pages/superAdmin";
import './App.css';

function App() {
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    console.log("Login bem-sucedido! Dados do utilizador:", userData);
    navigate("/home");
  };

  return (
    <Routes>
      <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/home" element={<PDFEditorFromBackend />} />
    </Routes>
  );
}

export default App;
