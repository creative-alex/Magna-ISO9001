import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../utils/apiFetch';


const EntryButton = ({ username, fontSize = '1.5vw', buttonHeight = '5vh' }) => {
  const [hasEntry, setHasEntry] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEntryStatus = async () => {
      if (!username) return;
      

      
      try {
        const response = await apiFetch(`/timetracking/checkEntry`, {
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          setHasEntry(data.hasEntry || false);
        }
      } catch (error) {
        console.error('Erro ao verificar entrada:', error);
      } finally {
        setLoading(false);
      }
    };

    checkEntryStatus();
  }, [username]);

  const handleClick = async () => {
    const now = new Date();
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    try {
      // Tentar registar online primeiro
      const response = await apiFetch(`/timetracking/registerEntry`, {
        method: 'POST',
        body: JSON.stringify({ time: formattedTime })
      });

      if (response.ok) {
        setHasEntry(true);
        toast.success(`✓ Entrada registada às ${formattedTime}`, { 
          position: 'top-right', 
          autoClose: 3000 
        });
      } else {
        throw new Error('Resposta não OK do servidor');
      }
    } catch (error) {
      // Se falhar, mostrar erro
      console.log('Erro ao registar online:', error);
      toast.error('Erro ao registar entrada. Tente novamente.');
    }
  };

  const baseClass = "w-full rounded-full border-2 bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] cursor-pointer transition-all duration-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70";

  if (loading) {
    return (
      <button className={`${baseClass} border-gold text-gold`} disabled style={{ fontSize, height: buttonHeight }}>
        A carregar...
      </button>
    );
  }

  return (
    <button
      className={`${baseClass} ${hasEntry ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white' : 'border-gold text-gold hover:bg-gold hover:text-white'}`}
      onClick={handleClick}
      disabled={hasEntry}
      style={{ fontSize, height: buttonHeight }}
    >
      {hasEntry ? 'Entrada Já Registrada' : 'Registar Entrada'}
    </button>
  );
};

export default EntryButton;

