import React from 'react';
import { apiFetch } from '../../../../utils/apiFetch';

const DeleteRegister = ({ username, date, year, onDelete, onSuccess }) => {
  const apagarregisto = async () => {
    try {
      const selectedYear = year || new Date().getFullYear();
      const response = await apiFetch(`/timetracking/deleteRegister`, {
        method: "DELETE",
        body: JSON.stringify({ uid: username, date, year: selectedYear }),
      });

      if (!response.ok) {
        throw new Error("Erro ao apagar o registo");
      }

      if (onDelete) onDelete(date);
      if (onSuccess) onSuccess(); 
    } catch (error) {
      console.error("❌ Erro ao apagar registo:", error);
    }
  };

  return (
    <button onClick={apagarregisto}>
      Apagar registo
    </button>
  );
};

export default DeleteRegister;

