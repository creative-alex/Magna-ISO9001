import React, { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaClipboardCheck } from "react-icons/fa6";
import { toast } from "react-toastify";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import { apiFetch } from "../../../shared/utils/apiFetch";
import { UserContext } from "../../../shared/context/userContext";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Painel de RH/Admin para acompanhar o fecho mensal de todos os colaboradores num único
// sítio (POST /fecho-mensal/all-status) - complementa a secção "Fecho Mensal" em
// userStats.jsx, que só mostra um colaborador de cada vez.
export default function FechoMensalAdmin() {
  const navigate = useNavigate();
  const { nivelAcesso } = useContext(UserContext);
  const isSuperAdmin = nivelAcesso === "SuperAdmin";

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingUid, setConfirmingUid] = useState(null);
  const [sendingUid, setSendingUid] = useState(null);
  const [sendingSecondUid, setSendingSecondUid] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggeringSecond, setTriggeringSecond] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const mes = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/fecho-mensal/all-status`, {
        method: "POST",
        body: JSON.stringify({ mes }),
      });
      const data = await response.json();
      if (response.ok) {
        setColaboradores(data.colaboradores || []);
      } else {
        toast.error(data.error || "Erro ao carregar o estado do fecho mensal");
        setColaboradores([]);
      }
    } catch (err) {
      console.error("Erro ao carregar fecho mensal:", err);
      toast.error("Erro ao carregar o estado do fecho mensal");
      setColaboradores([]);
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConfirm = async (uid) => {
    setConfirmingUid(uid);
    try {
      const response = await apiFetch(`/fecho-mensal/confirm`, {
        method: "POST",
        body: JSON.stringify({ uid, mes }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Fecho do mês confirmado");
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao confirmar o fecho do mês");
      }
    } catch (err) {
      console.error("Erro ao confirmar fecho mensal:", err);
      toast.error("Erro ao confirmar o fecho do mês");
    } finally {
      setConfirmingUid(null);
    }
  };

  const handleSendReminder = async (uid, urgent = false) => {
    const setBusy = urgent ? setSendingSecondUid : setSendingUid;
    setBusy(uid);
    try {
      const response = await apiFetch(`/fecho-mensal/send-reminder`, {
        method: "POST",
        body: JSON.stringify({ uid, mes, urgent }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Email enviado");
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao enviar o email");
      }
    } catch (err) {
      console.error("Erro ao enviar email de fecho mensal:", err);
      toast.error("Erro ao enviar o email");
    } finally {
      setBusy(null);
    }
  };

  const handleTriggerReminders = async () => {
    setTriggering(true);
    try {
      const response = await apiFetch(`/fecho-mensal/trigger-reminders`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Lembretes enviados: ${data.enviados}`);
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao enviar lembretes");
      }
    } catch (err) {
      console.error("Erro ao enviar lembretes de fecho mensal:", err);
      toast.error("Erro ao enviar lembretes");
    } finally {
      setTriggering(false);
    }
  };

  const handleTriggerSecondReminders = async () => {
    setTriggeringSecond(true);
    try {
      const response = await apiFetch(`/fecho-mensal/trigger-second-reminders`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Segundos lembretes enviados: ${data.enviados}`);
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao enviar segundos lembretes");
      }
    } catch (err) {
      console.error("Erro ao enviar segundos lembretes de fecho mensal:", err);
      toast.error("Erro ao enviar segundos lembretes");
    } finally {
      setTriggeringSecond(false);
    }
  };

  const handleTriggerSweep = async () => {
    setSweeping(true);
    try {
      const response = await apiFetch(`/fecho-mensal/trigger-sweep`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Meses sinalizados como não confirmados: ${data.sinalizados}`);
        await fetchStatus();
      } else {
        toast.error(data.error || "Erro ao sinalizar meses não confirmados");
      }
    } catch (err) {
      console.error("Erro ao sinalizar meses não confirmados:", err);
      toast.error("Erro ao sinalizar meses não confirmados");
    } finally {
      setSweeping(false);
    }
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleString("pt-PT") : "-");

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />
      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon={<FaClipboardCheck className="text-gold" />} title="Fecho Mensal" />

        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {MONTH_NAMES.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>

            {isSuperAdmin && (
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={handleTriggerReminders}
                  disabled={triggering}
                  title="Dispara já o email de aviso (dia 20) para todos os colaboradores ativos - útil para testar sem esperar pela data"
                  className="bg-[#C8932F] text-white border-0 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {triggering ? "A enviar..." : "Reenviar lembretes por email"}
                </button>
                <button
                  onClick={handleTriggerSecondReminders}
                  disabled={triggeringSecond}
                  title="Dispara já o segundo aviso (dia 24), só a quem ainda não confirmou - útil para testar sem esperar pela data"
                  className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {triggeringSecond ? "A enviar..." : "Reenviar 2º lembrete (teste)"}
                </button>
                <button
                  onClick={handleTriggerSweep}
                  disabled={sweeping}
                  title="Dispara já a verificação de dia 26 (sinaliza como não confirmado quem ainda não confirmou) - útil para testar sem esperar pela data"
                  className="bg-white text-[#C8932F] border border-[#C8932F] px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-[#C8932F]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sweeping ? "A verificar..." : "Sinalizar não confirmados (teste)"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Colaborador</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Estado</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Confirmado em</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Lembrete enviado</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">2º lembrete enviado</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                ) : colaboradores.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sem colaboradores para mostrar.</td></tr>
                ) : (
                  colaboradores.map((colaborador) => (
                    <tr key={colaborador.uid} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-800">{colaborador.nome}</td>
                      <td className="py-2.5 px-4">
                        {colaborador.confirmed ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-700">Confirmado</span>
                        ) : colaborador.flagged ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-700">Não confirmado</span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs bg-[#FAF3E6] text-[#8a6a22]">Pendente</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">{formatDate(colaborador.confirmedAt)}</td>
                      <td className="py-2.5 px-4 text-gray-600">{formatDate(colaborador.reminderSentAt)}</td>
                      <td className="py-2.5 px-4 text-gray-600">{formatDate(colaborador.secondReminderSentAt)}</td>
                      <td className="py-2.5 px-4 text-right">
                        {!colaborador.confirmed && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSendReminder(colaborador.uid)}
                              disabled={sendingUid === colaborador.uid}
                              title={colaborador.email ? `Enviar email para ${colaborador.email}` : "Colaborador sem email associado"}
                              className="bg-white text-[#C8932F] border border-[#C8932F] px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors hover:bg-[#C8932F]/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {sendingUid === colaborador.uid ? "A enviar..." : "Enviar email"}
                            </button>
                            <button
                              onClick={() => handleSendReminder(colaborador.uid, true)}
                              disabled={sendingSecondUid === colaborador.uid}
                              title={colaborador.email ? `Enviar 2º lembrete (último aviso) para ${colaborador.email}` : "Colaborador sem email associado"}
                              className="bg-white text-red-600 border border-red-600 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {sendingSecondUid === colaborador.uid ? "A enviar..." : "Enviar 2º lembrete"}
                            </button>
                            <button
                              onClick={() => handleConfirm(colaborador.uid)}
                              disabled={confirmingUid === colaborador.uid}
                              className="bg-[#C8932F] text-white border-0 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {confirmingUid === colaborador.uid ? "A confirmar..." : "Confirmar em nome de"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
