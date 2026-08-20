import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../utils/apiFetch';


const LeaveButton = ({ username, fontSize = '1.5vw', buttonHeight = '5vh' }) => {
  const [hasEntry, setHasEntry] = useState(false);
  const [hasLeave, setHasLeave] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!username) return;
      

      
      try {
        const [entryRes, leaveRes] = await Promise.all([
          apiFetch(`/timetracking/checkEntry`, { method: 'POST' }),
          apiFetch(`/timetracking/checkLeave`, { method: 'POST' }),
        ]);

        if (entryRes.ok) {
          const entryData = await entryRes.json();
          setHasEntry(entryData.hasEntry || false);
        }

        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setHasLeave(leaveData.hasLeave || false);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [username]);

  const isDisabled = !hasEntry || hasLeave;

  const handleClick = async () => {
    const now = new Date();
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    try {
      // Tentar registar online primeiro
      const response = await apiFetch(`/timetracking/registerLeave`, {
        method: 'POST',
        body: JSON.stringify({ time: formattedTime })
      });

      if (response.ok) {
        setHasLeave(true);
        toast.success(`✓ Saída registada às ${formattedTime}`, { 
          position: 'top-right', 
          autoClose: 3000 
        });
      } else {
        throw new Error('Resposta não OK do servidor');
      }
    } catch (error) {
      // Se falhar, mostrar erro
      console.log('Erro ao registar online:', error);
      toast.error('Erro ao registar saída. Tente novamente.');
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

  const getButtonState = () => {
    if (hasLeave) {
      return 'Saída Já Registrada';
    } else {
      return 'Registar Saída';
    }
  };

  return (
    <button
      className={`${baseClass} ${hasLeave ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white' : 'border-gold text-gold hover:bg-gold hover:text-white'}`}
      onClick={handleClick}
      disabled={isDisabled}
      style={{ fontSize, height: buttonHeight }}
    >
      {getButtonState()}
    </button>
  );
};

export default LeaveButton;
