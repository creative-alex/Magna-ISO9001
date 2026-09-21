import React, { useState } from 'react';
import { FaUmbrellaBeach } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';
import { usePermissions } from '../../../../shared/hooks/usePermissions';

const VacationButton = ({ username, date, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  // Tem de espelhar exatamente quem o backend deixa marcar férias por outro colaborador
  // (resolveTargetUid)  -  SuperAdmin/GestorRH sem restrições, Administrador também (o
  // backend confirma que é da sua própria entidade). Caso contrário o pedido sai sem
  // "uid" e acaba registado (pendente) na conta de quem clicou. Nome explícito (em vez
  // de um "isAdmin" ambíguo): isto NÃO é "só SuperAdmin", é o mesmo conjunto alargado
  // que auth.js chama isAdminOrHRorAdministrador.
  const { isAdminOrHRorAdministrador } = usePermissions();

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
        body: JSON.stringify(isAdminOrHRorAdministrador ? { uid: username, date } : { date }),
      });

      if (response.ok) {
        const message = isAdminOrHRorAdministrador
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
    <button onClick={handleRequest} disabled={loading} className="flex items-center gap-2">
      {loading ? 'A processar...' : (<><FaUmbrellaBeach className="text-[#C8932F]" /> Marcar Férias</>)}
    </button>
  );
};

export default VacationButton;
