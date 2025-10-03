import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, Link } from "react-router-dom";

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
      // Criar utilizador apenas no backend (evita auto-login)
      const newUser = { 
        nome, 
        email, 
        temporaryPassword: password, // Enviar password para criação no backend
        role: 'User',
        isFirstLogin: true
      };

      // Criar no backend
      const response = await fetch('http://192.168.1.219:8080/users/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar utilizador');
      }

      toast.success('Conta criada com sucesso! O utilizador pode agora fazer login.');
      
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
      if (error.message.includes('email-already-exists') || error.message.includes('Email já está em uso')) {
        errorMessage = 'Este e-mail já está em uso';
      } else if (error.message) {
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