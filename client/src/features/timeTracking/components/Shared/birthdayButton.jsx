import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../utils/apiFetch';

// Dia de aniversário: benefício de 1 dia/ano, separado da quota de férias.
// Ao contrário de VacationButton/MedicalLeave (fluxo de pedido), este botão
// alterna diretamente o dia (mesmo endpoint usado no Mapa de Férias), porque
// aqui é sempre um admin/GestorRH a marcar por outro colaborador.
const BirthdayButton = ({ username, date, isMarked, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/timetracking/toggle-birthday-day`, {
        method: "POST",
        body: JSON.stringify({ uid: username, date }),
      });

      if (response.ok) {
        toast.success(isMarked ? "Dia de aniversário removido" : "Dia de aniversário marcado com sucesso!");
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("Erro ao marcar dia de aniversário:", err);
      toast.error("Erro ao marcar dia de aniversário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleToggle} disabled={loading}>
      {loading ? 'A processar...' : isMarked ? '🎂 Remover Dia de Aniversário' : '🎂 Marcar Dia de Aniversário'}
    </button>
  );
};

export default BirthdayButton;
