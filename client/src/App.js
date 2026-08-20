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
import Cadastro from "./pages/Cadastro"
import Colaboradores from "./pages/Colaboradores"
import MapaFerias from "./pages/MapaFerias"
import ProcessamentoSalarios from "./pages/ProcessamentoSalarios"
import SalarioColaborador from "./pages/SalarioColaborador"
import RegistoNaoConformidade from "./pages/RegistoNaoConformidade";
import FirstLogin from "./components/Auth/firstLogin";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import TimeTrackingUserDashboard from "./pages/TimeTracking/UserDashboard";
import TimeTrackingRegistos from "./pages/TimeTracking/RegistosPage";
import TimeTrackingEntities from "./pages/TimeTracking/EntitiesPage";
import TimeTrackingEntityUsers from "./pages/TimeTracking/EntityUsers";
import TimeTrackingUserDetails from "./pages/TimeTracking/UserDetails";
import NewEntity from "./components/TimeTracking/Admin/entities/newEntity";
import NewTimeTrackingUser from "./components/TimeTracking/Admin/clients/newUser";

function App() {
  const navigate = useNavigate();
  const { setUsername, setUserEmail, setUserRole, setIsAuthenticated, isAuthenticated } = useContext(UserContext);

  const handleLoginSuccess = (userData, destination = "/dashboard") => {
    setUsername(userData.nome);
    setUserEmail(userData.email);
    setUserRole(userData.role);
    setIsAuthenticated(true);
    navigate(destination);
  };

  return (
    <TutorialProvider>
      <Routes>
        {/* Rota pública de login */}
        <Route
          path="/"
          element={
            isAuthenticated ?
              <Navigate to="/dashboard" replace /> :
              <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        
        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
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
          path="/cadastro"
          element={
            <ProtectedRoute>
              <Cadastro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cadastro/:id"
          element={
            <ProtectedRoute>
              <Cadastro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/colaboradores"
          element={
            <ProtectedRoute>
              <Colaboradores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ferias"
          element={
            <ProtectedRoute>
              <MapaFerias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salarios"
          element={
            <ProtectedRoute>
              <ProcessamentoSalarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salarios/:id"
          element={
            <ProtectedRoute>
              <SalarioColaborador />
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
          path="/reset-password"
          element={<FirstLogin mode="firstLogin" />}
        />
        <Route
          path="/forgot-password"
          element={<FirstLogin mode="forgot" />}
        />

        {/* Livro de Ponto */}
        <Route
          path="/ponto"
          element={
            <ProtectedRoute>
              <TimeTrackingUserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/registos"
          element={
            <ProtectedRoute>
              <TimeTrackingRegistos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/entidades"
          element={
            <ProtectedRoute>
              <TimeTrackingEntities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/entidades/:id_entidade"
          element={
            <ProtectedRoute>
              <TimeTrackingEntityUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/nova-entidade"
          element={
            <ProtectedRoute>
              <NewEntity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/novo-user"
          element={
            <ProtectedRoute>
              <NewTimeTrackingUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ponto/user-details/:uid"
          element={
            <ProtectedRoute>
              <TimeTrackingUserDetails />
            </ProtectedRoute>
          }
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
