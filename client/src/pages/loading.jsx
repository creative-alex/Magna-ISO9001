import React, { useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
        {/* Logo/Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Magna ISO 9001
          </h1>
        </div>

        {/* Spinner de Loading */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-indigo-400 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Texto de Loading */}
        <div className="mb-6">
          <p className="text-lg text-gray-700 font-medium">
            {loadingText}<span className="text-blue-600">{dots}</span>
          </p>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" 
               style={{
                 width: '75%',
                 animation: 'loading-bar 3s ease-in-out infinite'
               }}>
          </div>
        </div>

        {/* Mensagem adicional */}
        <p className="text-sm text-gray-500">
          Por favor aguarde...
        </p>
      </div>

      {/* CSS personalizado inline */}
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 75%; }
          100% { width: 100%; }
        }
        
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
