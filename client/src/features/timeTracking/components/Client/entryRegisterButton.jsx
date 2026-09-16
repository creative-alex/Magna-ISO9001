import React from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../../shared/utils/apiFetch';


// hasEntry/loading vêm do pai (RegistosPage), que lê /checkTimeTracking uma única vez
// e partilha o resultado com ExitButton - antes cada botão lia o seu próprio estado
// (este fazia /checkEntry, o de saída fazia /checkEntry + /checkLeave), 3 leituras
// onde 1 chamada a /checkTimeTracking já dá toda a informação.
const EntryButton = ({ hasEntry, loading, fontSize = '1.5vw', buttonHeight = '5vh', onSuccess }) => {
  const handleClick = async () => {
    const now = new Date();
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      // Tentar registar online primeiro
      const response = await apiFetch(`/timetracking/registerEntry`, {
        method: 'POST',
        body: JSON.stringify({ time: formattedTime })
      });

      if (response.ok) {
        toast.success(`✓ Entrada registada às ${formattedTime}`, {
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
      {hasEntry ? 'Entrada Já Registada' : 'Registar Entrada'}
    </button>
  );
};

export default EntryButton;

