import React, { useContext, useState } from 'react';
import { UserContext } from '../../../context/userContext';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../utils/apiFetch';

const VacationButton = ({ username, date, onSuccess }) => {
  const { nivelAcesso } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const isAdmin = nivelAcesso === "SuperAdmin";

  const handleRequest = async () => {
    if (!date) {
      toast.error('Dados inválidos');
      return;
    }

    setLoading(true);

    try {
      // Auto-serviço usa sempre o próprio uid (do token); um admin a marcar
      // férias por outro colaborador passa o "uid" desse colaborador.
      const response = await apiFetch(`/timetracking/vacation`, {
        method: "POST",
        body: JSON.stringify(isAdmin ? { uid: username, date } : { date }),
      });
      
      if (response.ok) {
        const message = isAdmin 
          ? "Férias registadas com sucesso!" 
          : "Pedido de férias enviado! Aguarda aprovação.";
        toast.success(message);
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao marcar férias: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error("Erro ao marcar férias:", err);
      toast.error("Erro ao marcar férias. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleRequest} disabled={loading}>
      {loading ? 'A processar...' : '🏖️ Marcar Férias'}
    </button>
  );
};

export default VacationButton;
