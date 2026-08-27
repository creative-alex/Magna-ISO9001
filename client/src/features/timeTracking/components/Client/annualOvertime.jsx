import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

const OvertimeManagerModal = ({ 
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
          startHour: editForm.startHour,
          endHour: editForm.endHour,
          hours,
          minutes,
          totalMinutes: hours * 60 + minutes,
          description: editForm.description
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      toast.success('Horas extras atualizadas com sucesso!');
      handleCancelEdit();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar horas extras');
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

      toast.success('Horas extras eliminadas com sucesso!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao eliminar:', error);
      toast.error('Erro ao eliminar horas extras');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-[600px] w-full p-6 relative max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Gerenciar Horas Extras</h2>
        <p className="text-sm text-gray-600 mb-5">Data: {selectedDate}</p>
        
        <div className="mt-5">
          {selectedDayEntries.length === 0 ? (
            <p className="text-center text-gray-500">
              Nenhuma hora extra encontrada para este dia.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDayEntries.map((entry, index) => (
                <div key={entry.id || index} className="p-4 border border-gray-200 rounded-lg">
                  {editingEntry?.id === entry.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hora Início:
                          </label>
                          <input
                            type="time"
                            value={editForm.startHour}
                            onChange={(e) => setEditForm({...editForm, startHour: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hora Término:
                          </label>
                          <input
                            type="time"
                            value={editForm.endHour}
                            onChange={(e) => setEditForm({...editForm, endHour: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição:
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(entry)}
                          className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          <strong>Horário:</strong> {entry.startHour} - {entry.endHour}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Total:</strong> {entry.hours}h {entry.minutes}m
                        </p>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Descrição:</strong> {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Eliminar
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
    </div>
  );
};

export default OvertimeManagerModal;
