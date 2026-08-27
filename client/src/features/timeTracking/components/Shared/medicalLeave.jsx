import React, { useContext, useState } from 'react';
import { UserContext } from '../../../../shared/context/userContext';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

const MedicalLeave = ({ username, date, onSuccess }) => {
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
      const response = await apiFetch(`/timetracking/medicalLeave`, {
        method: "POST",
        body: JSON.stringify(isAdmin ? { uid: username, date } : { date }),
      });
      
      if (response.ok) {
        const message = isAdmin 
          ? "Baixa médica registada com sucesso!" 
          : "Pedido de baixa médica enviado! Aguarda aprovação.";
        toast.success(message);
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(`Erro ao marcar baixa médica: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error("Erro ao marcar baixa médica:", err);
      toast.error("Erro ao marcar baixa médica. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleRequest} disabled={loading}>
      {loading ? 'A processar...' : '🏥 Marcar Baixa Médica'}
    </button>
  );
};

export default MedicalLeave;
