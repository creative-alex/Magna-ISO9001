import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, Link } from "react-router-dom";

// Configuração do Firebase usando variáveis do .env
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

const Register = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    // Validação do formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, insira um e-mail válido.');
      setLoading(false);
      return;
    }

    // Validação das passwords
    if (password.length < 6) {
      toast.error('A password deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Dados do utilizador para o backend (role padrão: 'User')
      const newUser = { 
        nome, 
        email, 
        role: 'User', // Auto-registo sempre como 'User'
        uid: user.uid,
        isFirstLogin: true
      };

      // Guardar no backend
      const response = await fetch('http://192.168.1.219:8080/users/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        // Se falhar no backend, eliminar do Firebase
        await user.delete();
        throw new Error('Erro ao guardar utilizador na base de dados');
      }

      toast.success('Conta criada com sucesso! Faça login para continuar.');
      
      // Limpar campos
      setNome('');
      setEmail('');
      setPassword('');
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar conta:', error);
      
      let errorMessage = 'Erro ao criar conta';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password muito fraca';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido';
          break;
        default:
          errorMessage = error.message;
      }
      
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Criar Nova Conta</h2>
      <p>Registe-se para aceder ao sistema ISO 9001</p>
      
      {message && <p className="error">{message}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome">Nome:</label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Insira o seu nome completo"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password Temporária:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Criando conta..." : "Criar Conta"}
        </button>
      </form>
      <ToastContainer />
    </div>
  );
};

export default Register;