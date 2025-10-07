import React, { useEffect, useState } from 'react';
import Logo from '../logo.svg';

const LoadingPage = () => {
  const [loadingText, setLoadingText] = useState('A carregar');
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animação dos pontos
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    // Rotação do texto de carregamento
    const textInterval = setInterval(() => {
      setLoadingText(prev => {
        const texts = [
          'A carregar',
          'A verificar autenticação',
          'A inicializar sistema',
          'A conectar ao servidor',
          'Quase pronto'
        ];
        const currentIndex = texts.indexOf(prev);
        return texts[(currentIndex + 1) % texts.length];
      });
    }, 2000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div className="file-container">
      <div className="header">
        <img src={Logo} alt="Logo" className="logo" />
        <h2 className="title">Magna ISO90001</h2>
      </div>
      
      <div className="file-panel">
        <div className="loading-content">
          {/* Spinner de Loading */}
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-pulse"></div>
          </div>

          {/* Texto de Loading */}
          <div className="loading-text">
            <p>
              {loadingText}<span className="loading-dots">{dots}</span>
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>

          {/* Mensagem adicional */}
          <p className="loading-message">
            Por favor aguarde...
          </p>
        </div>
      </div>

      <style jsx>{`
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
          max-width: 400px;
          margin: 0 auto;
        }

        .loading-spinner {
          position: relative;
          margin-bottom: 2rem;
        }

        .spinner-ring {
          width: 64px;
          height: 64px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #C8932F;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-pulse {
          position: absolute;
          top: 0;
          left: 0;
          width: 64px;
          height: 64px;
          border: 4px solid transparent;
          border-right: 4px solid rgba(200, 147, 47, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .loading-text {
          margin-bottom: 1.5rem;
        }

        .loading-text p {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .loading-dots {
          color: #C8932F;
          font-weight: bold;
        }

        .loading-progress {
          width: 100%;
          max-width: 300px;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #C8932F, #b8832a);
          border-radius: 4px;
          animation: loading-bar 3s ease-in-out infinite;
        }

        .loading-message {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          font-style: italic;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes loading-bar {
          0% { width: 0%; }
          25% { width: 30%; }
          50% { width: 60%; }
          75% { width: 85%; }
          100% { width: 100%; }
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .loading-content {
            padding: 2rem 1rem;
          }
          
          .spinner-ring,
          .spinner-pulse {
            width: 48px;
            height: 48px;
          }
          
          .loading-text p {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
