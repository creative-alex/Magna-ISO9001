import React, { useEffect, useState } from 'react';

const LoadingPage = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [15, 35, 55, 72, 88, 95];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#f9fafb',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>

      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: '#C8932F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>C</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>Magna ISO9001</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Cooperativa Comenius</div>
        </div>
      </div>

      {/* Spinner */}
      <div style={{ position: 'relative', width: 48, height: 48, marginBottom: 32 }}>
        <svg viewBox="0 0 48 48" style={{ width: 48, height: 48, animation: 'spin 1s linear infinite' }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="#C8932F" strokeWidth="4"
            strokeDasharray="30 96" strokeLinecap="round" />
        </svg>
      </div>

      {/* Barra de progresso */}
      <div style={{ width: 220, height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: '#C8932F', borderRadius: 2,
          width: `${progress}%`, transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#9ca3af' }}>A carregar...</div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingPage;
