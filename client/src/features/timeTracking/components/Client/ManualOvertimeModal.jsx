import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../utils/apiFetch';


const ManualOvertimeModal = ({ 
  show, 
  onClose, 
  selectedDayEntries,
  selectedDate,
  username,
  onUpdate
}) => {
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    startHour: '',
    endHour: '',
    description: ''
  });

  if (!show) return null;

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      startHour: entry.startHour || '',
      endHour: entry.endHour || '',
      description: entry.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({
      startHour: '',
      endHour: '',
      description: ''
    });
  };

  const handleSaveEdit = async (entry) => {
    if (!editForm.startHour || !editForm.endHour) {
      toast.error('Preencha as horas de início e término');
      return;
    }

    const calcDuration = (start, end) => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      return {
        hours: Math.floor(diff / 60),
        minutes: diff % 60
      };
    };

    const { hours, minutes } = calcDuration(editForm.startHour, editForm.endHour);

    if (hours === 0 && minutes === 0) {
      toast.error('As horas não podem ser iguais');
      return;
    }

    try {
      const response = await apiFetch(`/timetracking/update-manual-overtime`, {
        method: 'PUT',
        body: JSON.stringify({
          overtimeId: entry.id,
          date: entry.date,
          hourStart: editForm.startHour,
          hourEnd: editForm.endHour,
          hours,
          minutes,
          totalMinutes: hours * 60 + minutes,
          description: editForm.description
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success('Horas extras atualizadas!');
      handleCancelEdit();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar horas extras. Tente novamente.');
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Tem certeza que deseja eliminar estas horas extras?')) {
      return;
    }

    try {
      const response = await apiFetch(`/timetracking/delete-manual-overtime`, {
        method: 'DELETE',
        body: JSON.stringify({
          overtimeId: entry.id
        })
      });

      if (!response.ok) throw new Error('Erro ao eliminar');

      toast.success('Horas extras eliminadas!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao eliminar:', error);
      toast.error('Erro ao eliminar horas extras. Tente novamente.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-[600px] w-full p-6 relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Gerenciar Horas Extras</h2>
        <p className="text-sm text-gray-500 mb-5">📅 {selectedDate}</p>
        
        {selectedDayEntries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>Nenhuma hora extra encontrada para este dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDayEntries.map((entry, index) => (
              <div key={entry.id || index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                {editingEntry?.id === entry.id ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora de Começo:
                        </label>
                        <input
                          type="time"
                          value={editForm.startHour}
                          onChange={(e) => setEditForm({...editForm, startHour: e.target.value})}
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora de Termino:
                        </label>
                        <input
                          type="time"
                          value={editForm.endHour}
                          onChange={(e) => setEditForm({...editForm, endHour: e.target.value})}
                          className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                        />
                      </div>
                    </div>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição (opcional):
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        rows={3}
                        placeholder="Ex: Sessão de Esclarecimento, finalização de projeto, etc."
                        className="w-full h-24 border border-gray-300 rounded-md text-sm p-3 resize-y focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(entry)}
                        className="flex-1 py-3 px-4 border-none rounded-md bg-[#C8932F] text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#A47422]"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="text-sm mb-2">
                        <span className="font-medium text-gray-700">Horário: </span>
                        <span className="text-gray-900">{entry.startHour} - {entry.endHour}</span>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="font-medium text-gray-700">Total: </span>
                        <span className="text-[#C8932F] font-bold">{entry.hours}h {entry.minutes}m</span>
                      </div>
                      {entry.description && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Descrição: </span>
                          <span className="text-gray-600 italic">{entry.description}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualOvertimeModal;
