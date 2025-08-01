import React, { useContext } from "react";
import Login from './components/Auth/login';
import { Routes, Route, useNavigate } from "react-router-dom";
import SelecionarPdf from "./pages/selectPdf";
import TablePage from "./components/tabelaPDF"; 
import CreateProcess from "./pages/createProcess";
import Register from "./components/Auth/register";
import { UserContext } from "./context/userContext";
import NewTable from "./pages/newTable"
import './App.css';

function App() {
  const navigate = useNavigate();
  const { setUsername, setUserEmail } = useContext(UserContext);

  const handleLoginSuccess = (userData) => {
    
    setUsername(userData.nome);
    setUserEmail(userData.email);

    navigate("/file");
  };

  return (
      <Routes>
        <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/home" element={<SelecionarPdf />} />
        <Route path="/file" element={<SelecionarPdf />} />
        <Route path="/file/:filename" element={<TablePage />} />
        <Route path="/table/:filename" element={<TablePage />} />
        <Route path="/create-process" element={<CreateProcess />} />
        <Route path="/create-user" element={<Register />} />
        <Route path="/processamento" element={<NewTable />} />
        <Route path="/newtable" element={<NewTable />} />
      </Routes>
  );
};

export default App;