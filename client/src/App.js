import logo from './logo.svg';
import Login from './features/Auth/login';
import { ToastContainer } from 'react-toastify';

import './App.css';

function App() {
  const handleLoginSuccess = (userData) => {
  console.log("Login bem-sucedido! Dados do utilizador:", userData);
  };
  
  return (
    <Login onLoginSuccess={handleLoginSuccess}/>
  );
}

export default App;
