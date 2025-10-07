import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, Link } from "react-router-dom";
import Logo from "../../logo.svg";

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
      const response = await fetch('https://api-iso-9001.onrender.com/users/createUser', {
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
    <div className="file-container">
      <div className="header">
        <img src={Logo} alt="Logo" className="logo" />
        <h2 className="title">Magna ISO90001</h2>
      </div>
      <div className="file-panel">
        <div className="panel-title">Criar Nova Conta</div>
        
        {message && <div className="auth-error">{message}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="nome" className="auth-label">Nome:</label>
            <input
              id="nome"
              type="text"
              className="auth-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Insira o seu nome completo"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email:</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password Temporária:</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "A criar conta..." : "Criar Conta"}
          </button>
        </form>
      </div>

    </div>
  );
};

export default Register;
