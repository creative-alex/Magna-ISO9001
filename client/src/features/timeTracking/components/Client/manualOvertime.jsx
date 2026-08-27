import React, { useState } from "react";
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';


const ManualOvertimeButton = ({ username, onOvertimeRegistered, isOpen = false, onClose = null }) => {
  const [showModal, setShowModal] = useState(isOpen);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Data de hoje por padrão
    startHour: "",
    endHour: "",
    description: ""
  });

  // Atualizar showModal quando isOpen mudar
  React.useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validar campos obrigatórios
    if (!formData.startHour || !formData.endHour) {
      toast.error('Por favor, preencha as horas de início e término');
      setLoading(false);
      return;
    }

    // Calcular horas e minutos entre startHour e endHour
    const calcDuration = (start, end) => {
      if (!start || !end) return { hours: 0, minutes: 0 };
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      let startMinutes = sh * 60 + sm;
      let endMinutes = eh * 60 + em;
      let diff = endMinutes - startMinutes;
      if (diff < 0) diff += 24 * 60; // caso passe da meia-noite
      return {
        hours: Math.floor(diff / 60),
        minutes: diff % 60
      };
    };

    const { hours, minutes } = calcDuration(formData.startHour, formData.endHour);
    
    if (hours === 0 && minutes === 0) {
      toast.error('As horas de início e término não podem ser iguais');
      setLoading(false);
      return;
    }
    

    try {
      const response = await apiFetch(`/timetracking/register-manual-overtime`, {
        method: "POST",
        body: JSON.stringify({
          startHour: formData.startHour,
          endHour: formData.endHour,
          hours,
          minutes,
          date: formData.date,
          description: formData.description || "Horas extras trabalhadas após horário normal"
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Horas extras registradas:", data);
      
      toast.success(`Horas extras registradas com sucesso! (${hours}h ${minutes}m)`);
      
      // Resetar formulário
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startHour: "",
        endHour: "",
        description: ""
      });
      
      setShowModal(false);
      
      // Chamar callback para atualizar a página se fornecido
      if (onOvertimeRegistered) {
        onOvertimeRegistered();
      }
      
    } catch (error) {
      console.error("Erro ao registrar horas extras:", error);
      toast.error('Erro ao registrar horas extras. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getTotalMinutes = () => {
    if (!formData.startHour || !formData.endHour) return 0;
    const [sh, sm] = formData.startHour.split(":").map(Number);
    const [eh, em] = formData.endHour.split(":").map(Number);
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  // Se for usado apenas como modal (sem botão), retornar apenas o modal
  if (isOpen && onClose) {
    return (
      <>
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
            onClick={handleCloseModal}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-[500px] w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold text-gray-800 mb-5">Registrar Horas Extras</h2>

              <form onSubmit={handleSubmit} className="mt-5">
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do trabalho extra:
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full h-10 border border-gray-300 rounded-md text-sm px-3 focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Começo:
                    </label>
                    <input
                      type="time"
                      name="startHour"
                      value={formData.startHour}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Termino:
                    </label>
                    <input
                      type="time"
                      name="endHour"      
                      value={formData.endHour}
                      onChange={handleInputChange}
                      required  
                      className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição (opcional):
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Ex: Sessão de Esclarecimento, finalização de projeto, etc."
                    rows={3}
                    className="w-full h-24 border border-gray-300 rounded-md text-sm p-3 resize-y focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                  />
                </div>             

                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={loading}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || getTotalMinutes() === 0}
                    className="flex-1 py-3 px-4 border-none rounded-md bg-[#C8932F] text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {loading ? "A registar..." : "Registar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-2.5 px-4 bg-transparent text-gray-800 border-none rounded-none text-sm font-normal cursor-pointer flex items-center gap-2 text-left transition-colors hover:bg-gray-100"
        title="Registrar horas extras trabalhadas após o horário normal"
      >
        <span>📊 Horas Extras Manuais</span>
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-[500px] w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Registrar Horas Extras</h2>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do trabalho extra:
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full h-10 border border-gray-300 rounded-md text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Começo:
                  </label>
                  <input
                    type="time"
                    name="startHour"
                    value={formData.startHour}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Termino:
                  </label>
                  <input
                    type="time"
                    name="endHour"      
                    value={formData.endHour}
                    onChange={handleInputChange}
                    required  
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (opcional):
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Ex: Sessão de Esclarecimento, finalização de projeto, etc."
                  rows={3}
                  className="w-full h-24 border border-gray-300 rounded-md text-sm p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>             

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || getTotalMinutes() === 0}
                  className="flex-1 py-3 px-4 border-none rounded-md bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading ? "A registar..." : "Registar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualOvertimeButton;