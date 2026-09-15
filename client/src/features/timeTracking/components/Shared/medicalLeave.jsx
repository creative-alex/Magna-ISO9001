import React, { useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaNotesMedical, FaXmark, FaCalendarDay, FaCircleInfo, FaFilePdf } from 'react-icons/fa6';
import { UserContext } from '../../../../shared/context/userContext';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

// "DD-MM" ou "DD-MM-YYYY" -> "YYYY-MM-DD" (valor de um <input type="date">).
function ddmmParaIso(ddmm, anoPorOmissao) {
  if (!ddmm) return '';
  const [dd, mm, yyyy] = ddmm.split('-');
  return `${yyyy || anoPorOmissao}-${mm}-${dd}`;
}

// "YYYY-MM-DD" (valor de um <input type="date">) -> "DD-MM-YYYY" (formato do backend).
function isoParaBr(isoDate) {
  if (!isoDate) return null;
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

function isoParaBrCurto(isoDate) {
  if (!isoDate) return '';
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

// Só fins de semana  -  não conhecemos a sede do colaborador aqui (só o backend
// sabe, ver isWeekendOrHoliday em vacationController.js), por isso feriados só são
// validados no submit. Serve para dar feedback imediato e para a pré-visualização
// abaixo (que também só salta fins de semana; feriados são excluídos à parte pelo
// backend, que devolve as datas finais realmente marcadas).
function ehFimDeSemana(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-').map(Number);
  const diaSemana = new Date(yyyy, mm - 1, dd).getDay();
  return diaSemana === 0 || diaSemana === 6;
}

// Pré-visualização (aproximada, só salta fins de semana) do último dia do período,
// para o colaborador perceber logo o intervalo antes de submeter.
function calcularUltimoDiaPrevisto(isoInicio, diasUteis) {
  if (!isoInicio || ehFimDeSemana(isoInicio)) return null;
  const dias = parseInt(diasUteis, 10);
  if (!Number.isInteger(dias) || dias < 1) return null;

  const [yyyy, mm, dd] = isoInicio.split('-').map(Number);
  const cursor = new Date(yyyy, mm - 1, dd);
  let contados = 0;
  let ultimo = null;
  while (contados < dias) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      contados++;
      ultimo = new Date(cursor);
    }
    if (contados < dias) cursor.setDate(cursor.getDate() + 1);
  }
  return ultimo;
}

function formatarDataCurta(d) {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// Pedido de baixa médica: abre um modal a pedir o dia de início, quantos dias
// úteis a justificar e o PDF de justificação  -  nunca marca em fins de semana ou
// feriados (o backend salta-os automaticamente a contar a partir do dia de início,
// ver createMedicalLeave em vacationController.js).
//
// Com "date" (DD-MM) já definido  -  ex.: a partir do menu de contexto de um dia
// específico  -  esse dia vem pré-preenchido como início, mas continua editável
// (ao contrário de um pedido de férias de um único dia, aqui pode fazer sentido
// ajustar o início mesmo depois de clicar num dia errado).
const MedicalLeave = ({ username, date, onSuccess, triggerClassName, triggerLabel }) => {
  const { nivelAcesso } = useContext(UserContext);
  const [showModal, setShowModal] = useState(false);
  const [diaInicio, setDiaInicio] = useState('');
  const [diasUteis, setDiasUteis] = useState('1');
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tem de espelhar exatamente quem o backend deixa marcar baixa médica por outro
  // colaborador (resolveTargetUid)  -  SuperAdmin/GestorRH sem restrições, Administrador
  // também (o backend confirma que é da sua própria entidade). Caso contrário o pedido
  // sai sem "uid" e acaba registado (pendente) na conta de quem clicou.
  const isAdmin = nivelAcesso === "SuperAdmin" || nivelAcesso === "GestorRH" || nivelAcesso === "Administrador";

  const openModal = (e) => {
    if (e) e.stopPropagation();
    setDiaInicio(date ? ddmmParaIso(date, new Date().getFullYear()) : '');
    setDiasUteis('1');
    setPdfFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
  };

  const ultimoDiaPrevisto = useMemo(
    () => calcularUltimoDiaPrevisto(diaInicio, diasUteis),
    [diaInicio, diasUteis]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      toast.error('O documento de justificação tem de ser um PDF');
      e.target.value = '';
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!diaInicio) {
      toast.error('Escolhe o dia de início da baixa');
      return;
    }
    if (ehFimDeSemana(diaInicio)) {
      toast.error('Não é possível marcar baixa médica com início num fim de semana. Escolhe um dia útil.');
      return;
    }
    const dias = parseInt(diasUteis, 10);
    if (!Number.isInteger(dias) || dias < 1) {
      toast.error('Indica quantos dias úteis a baixa abrange');
      return;
    }
    if (!pdfFile) {
      toast.error('Anexa o documento de justificação (PDF)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('folderPath', 'BaixasMedicas/');
      formData.append('filename', `${isoParaBrCurto(diaInicio)}_${Date.now()}.pdf`);

      const uploadResponse = await apiFetch('/files/upload-document', { method: 'POST', body: formData });
      if (!uploadResponse.ok) {
        toast.error('Erro ao enviar o documento de justificação. Tente novamente.');
        return;
      }
      const { path: pdfPath } = await uploadResponse.json();

      const response = await apiFetch('/timetracking/medicalLeave', {
        method: 'POST',
        body: JSON.stringify(isAdmin
          ? { uid: username, startDate: isoParaBr(diaInicio), businessDays: dias, pdfPath }
          : { startDate: isoParaBr(diaInicio), businessDays: dias, pdfPath }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao marcar baixa médica');
        return;
      }

      toast.success(data.message || (isAdmin ? 'Baixa médica registada com sucesso!' : 'Pedido de baixa médica enviado! Aguarda aprovação.'));
      setShowModal(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao marcar baixa médica:', err);
      toast.error('Erro ao marcar baixa médica. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[440px] w-full overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeModal}
          disabled={loading}
          className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed z-10"
        >
          <FaXmark size={16} />
        </button>

        <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
          <span className="w-10 h-10 rounded-xl bg-[#C8932F]/10 text-[#C8932F] flex items-center justify-center shrink-0">
            <FaNotesMedical size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">Pedir baixa médica</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6">
          <div className="flex items-start gap-2 bg-[#C8932F]/10 text-[#8a6a22] text-xs leading-relaxed rounded-lg px-3 py-2.5 mb-5">
            <FaCircleInfo className="mt-0.5 shrink-0" size={13} />
            <span>
              {isAdmin
                ? 'Fica registada de imediato. Não é possível marcar baixa em fins de semana ou feriados  -  esses dias são sempre saltados automaticamente.'
                : 'Fica pendente de aprovação de um Gestor(a) de RH ou Administrador. Não é possível marcar baixa em fins de semana ou feriados  -  esses dias são sempre saltados automaticamente.'}
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Dia de início</label>
            <input
              type="date"
              value={diaInicio}
              onChange={(e) => setDiaInicio(e.target.value)}
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
            />
            {diaInicio && ehFimDeSemana(diaInicio) && (
              <p className="text-xs text-danger mt-1.5">Este dia é um fim de semana  -  escolhe um dia útil.</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Quantos dias úteis</label>
            <input
              type="number"
              min={1}
              max={366}
              step={1}
              value={diasUteis}
              onChange={(e) => setDiasUteis(e.target.value)}
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
            />
            {ultimoDiaPrevisto && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                <FaCalendarDay className="text-gray-400" size={11} />
                Até {formatarDataCurta(ultimoDiaPrevisto)} (feriados são excluídos automaticamente)
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Documento de justificação (PDF)</label>
            <label className="flex items-center gap-2 w-full p-2.5 border border-dashed border-gray-300 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <FaFilePdf className={pdfFile ? "text-[#C8932F]" : "text-gray-400"} />
              <span className={`truncate ${pdfFile ? "text-gray-800" : "text-gray-400"}`}>
                {pdfFile ? pdfFile.name : 'Escolher ficheiro PDF...'}
              </span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-full bg-white text-gray-600 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 border-none rounded-full bg-[#C8932F] text-white text-sm font-semibold cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? 'A enviar...' : 'Pedir baixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName || "flex items-center gap-2"}>
        {triggerLabel || (<><FaNotesMedical className="text-[#C8932F]" /> Pedir Baixa Médica</>)}
      </button>

      {showModal && createPortal(modal, document.body)}
    </>
  );
};

export default MedicalLeave;
