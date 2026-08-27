import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen w-full bg-white bg-opacity-95">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
      <p className="mt-4 text-blue-500 font-semibold text-lg tracking-wider">A carregar...</p>
    </div>
  );
};

export default LoadingSpinner;
