import React from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../../shared/utils/apiFetch';


// hasEntry/hasLeave/loading vêm do pai (RegistosPage), partilhados com EntryButton -
// ver nota em entryRegisterButton.jsx (era /checkEntry + /checkLeave só para este
// botão, mais /checkEntry outra vez no botão de entrada; agora é 1 leitura só,
// reaproveitada pelos dois).
const LeaveButton = ({ hasEntry, hasLeave, loading, fontSize = '1.5vw', buttonHeight = '5vh', onSuccess }) => {
  const isDisabled = !hasEntry || hasLeave;

  const handleClick = async () => {
    const now = new Date();
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      // Tentar registar online primeiro
      const response = await apiFetch(`/timetracking/registerLeave`, {
        method: 'POST',
        body: JSON.stringify({ time: formattedTime })
      });

      if (response.ok) {
        toast.success(`✓ Saída registada às ${formattedTime}`, {
          position: 'top-right',
          autoClose: 3000
        });
        if (onSuccess) onSuccess();
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
      return 'Saída Já Registada';
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
