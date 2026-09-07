import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

const formatMinutes = (min) => `${Math.floor(min / 60)}h ${min % 60}m`;

// Compensa o défice de um dia com menos de 8h usando o saldo anual de horas
// extra. O mensal nunca é tocado (fica só a acumular); o utilizador escolhe
// quantos minutos quer compensar (até ao défice do dia), com um atalho para
// preencher automaticamente o défice todo. Auto-serviço usa sempre o próprio
// uid (do token, sem enviar "uid"); um admin a compensar em nome de outro
// colaborador passa o uid desse colaborador (tal como VacationButton/
// BirthdayButton) — nunca o "username" do UserContext, que é o NOME da
// pessoa, não o uid do Firebase.
const CompensateOvertimeButton = ({ uid, date, deficitMinutes = 0, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(false);

  const openModal = (e) => {
    if (e) e.stopPropagation();
    setHours('');
    setMinutes('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
  };

  const handleAutoFill = () => {
    setHours(String(Math.floor(deficitMinutes / 60)));
    setMinutes(String(deficitMinutes % 60));
  };

  const totalMinutesChosen = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalMinutesChosen <= 0) {
      toast.error('Indica quantas horas queres compensar');
      return;
    }
    if (totalMinutesChosen > deficitMinutes) {
      toast.error(`Não podes compensar mais do que o défice deste dia (${formatMinutes(deficitMinutes)})`);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/timetracking/compensate-short-day`, {
        method: "POST",
        body: JSON.stringify(uid ? { uid, date, minutes: totalMinutesChosen } : { date, minutes: totalMinutesChosen }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao compensar o dia");
        return;
      }

      toast.success(`${formatMinutes(totalMinutesChosen)} compensadas com o saldo anual de horas extra`);
      setShowModal(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Erro ao compensar dia:", err);
      toast.error("Erro ao compensar o dia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        title="Compensar défice deste dia com o saldo anual de horas extra"
        className="ml-2 px-2 py-0.5 text-xs font-medium border border-gold rounded text-gold bg-transparent cursor-pointer transition-colors hover:bg-gold hover:text-white"
      >
        Compensar
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-[420px] w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-2xl font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Compensar dia</h2>
            <p className="text-sm text-gray-600 mb-5">
              Défice deste dia: <strong>{formatMinutes(deficitMinutes)}</strong>. Escolhe quantas horas queres
              descontar do saldo anual de horas extra para compensar este dia.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas</label>
                  <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8932F]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoFill}
                className="mb-5 text-xs font-medium underline text-gold bg-transparent border-none cursor-pointer"
              >
                Preencher automaticamente até ao défice ({formatMinutes(deficitMinutes)})
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md bg-transparent text-gray-700 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || totalMinutesChosen <= 0}
                  className="flex-1 py-3 px-4 border-none rounded-md bg-[#C8932F] text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loading ? "A compensar..." : "Compensar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CompensateOvertimeButton;
