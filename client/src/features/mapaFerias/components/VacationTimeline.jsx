import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaXmark,
  FaChevronLeft,
  FaChevronRight,
  FaUmbrellaBeach,
} from "react-icons/fa6";
import { apiFetch } from "../../../shared/utils/apiFetch";
import { UserContext } from "../../../shared/context/userContext";
import { NATIONAL_HOLIDAYS_DDMM, getMunicipalHolidayDDMM, getMoveableHolidays } from "../../../shared/utils/holidays";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
// Índice = Date.getDay() (0 = Domingo)
const WEEKDAY_LETTERS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];
const DISPENSA_DAYS = [24, 31]; // Dezembro: dias de dispensa da empresa, não contam como férias
// 24 e 31 de dezembro já são tratados à parte como "dispensa", por isso saem
// daqui para não aparecerem duplicados como "feriado" e "dispensa" ao mesmo tempo.
const FIXED_HOLIDAYS_DDMM = NATIONAL_HOLIDAYS_DDMM.filter((ddmm) => ddmm !== "24-12" && ddmm !== "31-12");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getSunday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// Semanas completas (domingo a sábado) cobrindo o mês, incluindo os dias dos
// meses anterior/seguinte que preenchem a primeira e última semana  -  para a
// grelha mensal ao estilo Google Calendar (ver MobileMonthCalendar).
function getMonthGridWeeks(year, month) {
  const start = getSunday(new Date(year, month, 1));
  const lastOfMonth = new Date(year, month + 1, 0);
  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function formatDateStr(dateObj) {
  return `${pad2(dateObj.getDate())}-${pad2(dateObj.getMonth() + 1)}-${dateObj.getFullYear()}`;
}

// Ignora acentos/maiúsculas para a pesquisa (ex.: "gestao" encontra "Gestão").
function normalizeText(str) {
  return (str || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function getInitials(nome) {
  const parts = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildVacationMap(employees) {
  const map = new Map();
  employees.forEach((emp) => {
    map.set(emp.uid, new Set(emp.approvedDaysCurrentYear || []));
  });
  return map;
}

function buildBirthdayMap(employees) {
  const map = new Map();
  employees.forEach((emp) => {
    map.set(emp.uid, new Set(emp.birthdayDaysCurrentYear || []));
  });
  return map;
}

export default function VacationTimeline({ year, onYearChange }) {
  const { uid, nivelAcesso } = useContext(UserContext);
  const isAdminOrHR = nivelAcesso === "SuperAdmin" || nivelAcesso === "GestorRH";

  const [employees, setEmployees] = useState([]);
  const [vacationMap, setVacationMap] = useState(new Map());
  const [birthdayMap, setBirthdayMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("timeline"); // "timeline" | "resumo"
  const [search, setSearch] = useState(""); // filtra por nome, função, entidade ou local (ver filteredEmployees)
  // Pesquisa própria da lista de colaboradores no calendário mensal de telemóvel
  // (ver MobileMonthCalendar)  -  independente da pesquisa da timeline no desktop.
  const [mobileSearch, setMobileSearch] = useState("");
  // Colaborador cujo calendário está a ser mostrado na vista mensal de telemóvel
  // (arranca no próprio utilizador, mas pode escolher qualquer colega na lista).
  const [selectedMobileUid, setSelectedMobileUid] = useState(uid);
  // Em ecrãs estreitos arranca em "semana" (7 colunas cabem bem); no desktop
  // continua a arrancar em "mês", como antes.
  const [rangeMode, setRangeMode] = useState(() =>
    (window.matchMedia("(max-width: 767px)").matches ? "week" : "month")
  ); // "month" | "week"  -  quantos dias a timeline mostra de cada vez
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));
  // Permite marcar/desmarcar vários dias seguidos arrastando o rato: guarda a
  // linha e o estado-alvo (marcar ou desmarcar) definidos pelo primeiro dia clicado.
  const [dragInfo, setDragInfo] = useState(null);
  // Mini-tooltip que sugere trocar um dia de férias recém-marcado para aniversário
  // (ver handleDayMouseDown)  -  { rowUid, dateStr, x, y } | null.
  const [birthdaySuggestion, setBirthdaySuggestion] = useState(null);

  useEffect(() => {
    const clearDrag = () => setDragInfo(null);
    window.addEventListener("mouseup", clearDrag);
    return () => window.removeEventListener("mouseup", clearDrag);
  }, []);

  // Desaparece sozinho passado um tempo, para não ficar pendurado no ecrã.
  useEffect(() => {
    if (!birthdaySuggestion) return;
    const timer = setTimeout(() => setBirthdaySuggestion(null), 6000);
    return () => clearTimeout(timer);
  }, [birthdaySuggestion]);

  const loadMap = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/timetracking/vacation-map", {
        method: "POST",
        body: JSON.stringify({ year }),
      });
      if (!response.ok) throw new Error("Falha ao carregar o mapa de férias");
      const data = await response.json();
      const list = data.employees || [];
      setEmployees(list);
      setVacationMap(buildVacationMap(list));
      setBirthdayMap(buildBirthdayMap(list));
    } catch (err) {
      console.error("Erro ao carregar mapa de férias:", err);
      toast.error("Erro ao carregar o mapa de férias");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const employeesByUid = useMemo(() => {
    const map = {};
    employees.forEach((emp) => { map[emp.uid] = emp; });
    return map;
  }, [employees]);

  // Ordem por omissão da timeline (e base para o Resumo, que tem o seu próprio
  // controlo para reordenar por entidade  -  ver ResumoTab): por nome, com o
  // colaborador com sessão iniciada sempre em primeiro lugar.
  const sortedEmployees = useMemo(() => {
    const sorted = [...employees].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
    const currentIndex = sorted.findIndex((e) => e.uid === uid);
    return currentIndex > 0
      ? [sorted[currentIndex], ...sorted.slice(0, currentIndex), ...sorted.slice(currentIndex + 1)]
      : sorted;
  }, [employees, uid]);

  // Pesquisa por nome, função, entidade ou local  -  aplica-se às duas vistas.
  const filteredEmployees = useMemo(() => {
    const query = normalizeText(search.trim());
    if (!query) return sortedEmployees;
    return sortedEmployees.filter((emp) =>
      [emp.nome, emp.role, emp.entidade, emp.sede].some((field) => normalizeText(field).includes(query))
    );
  }, [sortedEmployees, search]);

  // A mesma pesquisa, mas para a lista de colaboradores do calendário mensal de
  // telemóvel (ver MobileMonthCalendar)  -  usa o seu próprio termo de pesquisa.
  const mobileFilteredEmployees = useMemo(() => {
    const query = normalizeText(mobileSearch.trim());
    if (!query) return sortedEmployees;
    return sortedEmployees.filter((emp) =>
      [emp.nome, emp.role, emp.entidade, emp.sede].some((field) => normalizeText(field).includes(query))
    );
  }, [sortedEmployees, mobileSearch]);

  // Feriados nacionais/móveis  -  iguais para todos; o feriado municipal varia por
  // sede, por isso é calculado por colaborador (ver rowHolidaySet, mais abaixo).
  const nationalHolidaySet = useMemo(
    () => new Set([...FIXED_HOLIDAYS_DDMM, ...getMoveableHolidays(year)]),
    [year]
  );

  const canEdit = (rowUid) => rowUid === uid || isAdminOrHR;

  const handleDayMouseDown = (rowUid, dateStr, isMarkedInMode, canToggle, toggleHandler, event) => {
    if (!canToggle) return;
    setDragInfo({ rowUid, targetState: !isMarkedInMode, toggleHandler });
    toggleHandler(rowUid, dateStr);

    // Um dia em branco só pode ficar marcado como férias (é o único destino possível
    // nesse caso  -  ver toggleHandler mais abaixo); se o colaborador ainda não usou o
    // dia de aniversário deste ano, sugere trocar este dia para aniversário em vez de
    // férias, já marcadas de imediato (o mini-tooltip é só um atalho para corrigir). Só
    // no clique que inicia a interação, nunca durante um arrasto (ver
    // handleDayMouseEnter), para não interromper a marcação em série.
    setBirthdaySuggestion(null);
    if (!isMarkedInMode) {
      const hasBirthdayThisYear = (birthdayMap.get(rowUid)?.size || 0) > 0;
      if (!hasBirthdayThisYear) {
        setBirthdaySuggestion({ rowUid, dateStr, x: event.clientX, y: event.clientY });
      }
    }
  };

  const acceptBirthdaySuggestion = () => {
    if (!birthdaySuggestion) return;
    const { rowUid, dateStr } = birthdaySuggestion;
    toggleVacationDay(rowUid, dateStr); // desmarca as férias que tinham acabado de ser marcadas
    toggleBirthdayDay(rowUid, dateStr); // marca aniversário no lugar
    setBirthdaySuggestion(null);
  };

  const handleDayMouseEnter = (rowUid, dateStr, isMarkedInMode, canToggle) => {
    if (!dragInfo || dragInfo.rowUid !== rowUid || !canToggle) return;
    if (isMarkedInMode === dragInfo.targetState) return;
    dragInfo.toggleHandler(rowUid, dateStr);
  };

  const goToMonth = (delta) => {
    let nextMonth = activeMonth + delta;
    if (nextMonth < 0) { nextMonth = 11; onYearChange(year - 1); }
    else if (nextMonth > 11) { nextMonth = 0; onYearChange(year + 1); }
    setActiveMonth(nextMonth);
  };

  const goToWeek = (delta) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
    setActiveMonth(next.getMonth());
    if (next.getFullYear() !== year) onYearChange(next.getFullYear());
  };

  const toggleVacationDay = async (rowUid, dateStr) => {
    if (!canEdit(rowUid)) return;

    const currentSet = vacationMap.get(rowUid) || new Set();
    const isChecked = currentSet.has(dateStr);

    if (!isChecked) {
      const emp = employeesByUid[rowUid];
      const saldoLive = (emp?.quotaAtual || 0) + (emp?.carryoverAtual || 0) - currentSet.size;
      if (saldoLive <= 0) {
        toast.error(`${emp?.nome || "Colaborador"} não tem dias de férias disponíveis`);
        return;
      }
    }

    const flip = (prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(rowUid) || []);
      if (set.has(dateStr)) set.delete(dateStr); else set.add(dateStr);
      next.set(rowUid, set);
      return next;
    };

    setVacationMap(flip);

    try {
      const response = await apiFetch("/timetracking/toggle-vacation-day", {
        method: "POST",
        body: JSON.stringify({ uid: rowUid, date: dateStr }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar dia de férias");
    } catch (err) {
      console.error(err);
      setVacationMap(flip); // reverter (a mesma operação é a sua própria inversa)
      toast.error("Erro ao atualizar dia de férias");
    }
  };

  const toggleBirthdayDay = async (rowUid, dateStr) => {
    if (!canEdit(rowUid)) return;

    const currentSet = birthdayMap.get(rowUid) || new Set();
    const isChecked = currentSet.has(dateStr);

    if (!isChecked && currentSet.size >= 1) {
      const emp = employeesByUid[rowUid];
      toast.error(`${emp?.nome || "Colaborador"} já utilizou o dia de aniversário deste ano`);
      return;
    }

    const flip = (prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(rowUid) || []);
      if (set.has(dateStr)) set.delete(dateStr); else set.add(dateStr);
      next.set(rowUid, set);
      return next;
    };

    setBirthdayMap(flip);

    try {
      const response = await apiFetch("/timetracking/toggle-birthday-day", {
        method: "POST",
        body: JSON.stringify({ uid: rowUid, date: dateStr }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar dia de aniversário");
    } catch (err) {
      console.error(err);
      setBirthdayMap(flip); // reverter (a mesma operação é a sua própria inversa)
      toast.error("Erro ao atualizar dia de aniversário");
    }
  };

  const updateQuotaOverride = async (targetUid, newQuota) => {
    try {
      const response = await apiFetch("/timetracking/vacation-quota-override", {
        method: "POST",
        body: JSON.stringify({ uid: targetUid, year, quota: newQuota }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar quota");
      toast.success(newQuota === null ? "Quota reposta para o valor automático" : "Quota atualizada");
      await loadMap();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar a quota de férias");
    }
  };

  const updateCarryover = async (targetUid, newDays) => {
    try {
      const response = await apiFetch("/timetracking/vacation-carryover", {
        method: "POST",
        body: JSON.stringify({ uid: targetUid, year, days: newDays }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar transição de férias");
      toast.success("Transição de férias atualizada");
      await loadMap();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar a transição de férias");
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">A carregar mapa de férias...</div>;
  }

  // Dados do colaborador escolhido na lista, para a vista mensal em telemóvel
  // (ver MobileMonthCalendar)  -  a timeline continua a mostrar toda a equipa.
  // Arranca no próprio utilizador mas pode mudar para qualquer colega.
  const mobileEmployee = employeesByUid[selectedMobileUid];
  const mobileVacationSet = vacationMap.get(selectedMobileUid) || new Set();
  const mobileBirthdaySet = birthdayMap.get(selectedMobileUid) || new Set();
  const mobileHolidaySet = mobileEmployee
    ? new Set([...nationalHolidaySet, getMunicipalHolidayDDMM(mobileEmployee.sede, year)])
    : nationalHolidaySet;
  const mobileSaldo = mobileEmployee
    ? mobileEmployee.quotaAtual + mobileEmployee.carryoverAtual - mobileVacationSet.size
    : 0;

  const daysInMonth = new Date(year, activeMonth + 1, 0).getDate();
  const visibleDays = rangeMode === "week"
    ? Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; })
    : Array.from({ length: daysInMonth }, (_, i) => new Date(year, activeMonth, i + 1));
  const today = new Date();

  // Em vista de mês (até 31 colunas) força uma largura mínima por dia, para as
  // células nunca ficarem ilegíveis em ecrãs estreitos - a grelha passa a ter
  // scroll horizontal próprio nesse caso (ver overflow-x-auto mais abaixo).
  const dayTrackMinWidth = visibleDays.length * (rangeMode === "month" ? 36 : 32);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]}`
    : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()].slice(0, 3)}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gold-light text-gold flex items-center justify-center shrink-0">
            <FaUmbrellaBeach size={16} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 leading-tight">Mapa de Férias</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Consulta e gestão dos dias de férias da equipa</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* No telemóvel a pesquisa e a navegação por mês vivem dentro do calendário
              mensal (ver MobileMonthCalendar); aqui é só para o desktop. */}
          <div className="relative hidden md:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome, função, entidade ou local de trabalho"
              className="text-sm bg-gray-50 border border-gray-100 rounded-lg pl-8 pr-3 py-2 w-72 sm:w-[28rem] focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder:text-gray-400"
            />
          </div>
          {viewMode === "timeline" ? (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => (rangeMode === "week" ? goToWeek(-1) : goToMonth(-1))}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                {rangeMode === "week" ? weekLabel : `${MONTH_NAMES[activeMonth]} ${year}`}
              </span>
              <button
                onClick={() => (rangeMode === "week" ? goToWeek(1) : goToMonth(1))}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onYearChange(year - 1)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center">{year}</span>
              <button
                onClick={() => onYearChange(year + 1)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          )}
          {/* O Resumo é uma vista só de desktop  -  no telemóvel a lista de
              colaboradores do calendário mensal já cobre a mesma necessidade. */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setViewMode("timeline")}
              className={`text-xs font-medium transition-colors underline-offset-4 ${
                viewMode === "timeline" ? "text-gold underline" : "text-gray-400 hover:text-gray-600 no-underline"
              }`}
            >
              Linha do tempo
            </button>
            <span className="text-gray-300 text-xs">/</span>
            <button
              onClick={() => setViewMode("resumo")}
              className={`text-xs font-medium transition-colors underline-offset-4 ${
                viewMode === "resumo" ? "text-gold underline" : "text-gray-400 hover:text-gray-600 no-underline"
              }`}
            >
              Resumo
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-3 sm:py-5">
        {/* Telemóvel: sempre o calendário mensal ao estilo Google Calendar do
            colaborador escolhido na lista abaixo (começa no próprio utilizador).
            Não depende do viewMode  -  no telemóvel não há Resumo. */}
        <div className="md:hidden flex flex-col gap-3">
          <MobileMonthCalendar
            year={year}
            activeMonth={activeMonth}
            onPrevMonth={() => goToMonth(-1)}
            onNextMonth={() => goToMonth(1)}
            employee={mobileEmployee}
            isSelf={selectedMobileUid === uid}
            vacationSet={mobileVacationSet}
            birthdaySet={mobileBirthdaySet}
            holidaySet={mobileHolidaySet}
            editable={canEdit(selectedMobileUid)}
            saldo={mobileSaldo}
            onDayTap={(dateStr, isMarkedInMode, isBirthday, event) => {
              const toggleHandler = isBirthday ? toggleBirthdayDay : toggleVacationDay;
              handleDayMouseDown(selectedMobileUid, dateStr, isMarkedInMode, true, toggleHandler, event);
            }}
          />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Procurar por nome, função, entidade ou local de trabalho"
                className="w-full text-sm bg-gray-50 border border-gray-100 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder:text-gray-400"
              />
            </div>

            {mobileFilteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Nenhum colaborador encontrado</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {mobileFilteredEmployees.map((emp) => {
                  const isSelected = emp.uid === selectedMobileUid;
                  return (
                    <button
                      key={emp.uid}
                      type="button"
                      onClick={() => setSelectedMobileUid(emp.uid)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left ${
                        isSelected ? "bg-gold-light ring-1 ring-gold-mid" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-9 h-9 shrink-0 rounded-full bg-gold-light text-gold text-xs font-semibold flex items-center justify-center">
                        {getInitials(emp.nome)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm truncate ${isSelected ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                          {emp.nome}{emp.uid === uid ? " (eu)" : ""}
                        </div>
                        {(emp.role || emp.entidade) && (
                          <div className="text-xs text-gray-400 truncate">{emp.role || emp.entidade}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: alterna entre a timeline da equipa e o Resumo. */}
        <div className="hidden md:block">
          {viewMode === "resumo" ? (
            <ResumoTab
              employees={filteredEmployees}
              vacationMap={vacationMap}
              birthdayMap={birthdayMap}
              year={year}
              isAdminOrHR={isAdminOrHR}
              onQuotaChange={updateQuotaOverride}
              onCarryoverChange={updateCarryover}
              currentUid={uid}
            />
          ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <div className="">
            {/* Régua de dias, alinhada com as faixas de cada colaborador em baixo */}
            <div className="flex mb-1.5">
              <div className="w-[52px] sm:w-[190px] shrink-0 sticky left-0 z-10 bg-white flex items-center gap-2 pl-1">
                <button
                  onClick={() => setRangeMode("month")}
                  className={`text-xs font-medium transition-colors underline-offset-4 ${
                    rangeMode === "month" ? "text-gold underline" : "text-gray-400 hover:text-gray-600 no-underline"
                  }`}
                >
                  Mês
                </button>
                <span className="text-gray-300 text-xs">/</span>
                <button
                  onClick={() => setRangeMode("week")}
                  className={`text-xs font-medium transition-colors underline-offset-4 ${
                    rangeMode === "week" ? "text-gold underline" : "text-gray-400 hover:text-gray-600 no-underline"
                  }`}
                >
                  Semana
                </button>
              </div>
              <div className="flex flex-1" style={{ minWidth: dayTrackMinWidth }}>
                {visibleDays.map((dateObj) => {
                  const day = dateObj.getDate();
                  const isToday = dateObj.toDateString() === today.toDateString();
                  const weekday = dateObj.getDay();
                  const isWeekend = weekday === 0 || weekday === 6;
                  return (
                    <div key={formatDateStr(dateObj)} className="flex-1 text-center overflow-hidden">
                      <div className={`text-[8px] font-semibold leading-none mb-0.5 whitespace-nowrap ${isToday ? "text-gold" : isWeekend ? "text-gray-500" : "text-gray-300"}`}>
                        {WEEKDAY_LETTERS[weekday]}
                      </div>
                      <span className={`text-xs font-medium ${isToday ? "text-gold" : isWeekend ? "text-gray-500" : "text-gray-300"}`}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {filteredEmployees.map((emp) => {
                const rowSet = vacationMap.get(emp.uid) || new Set();
                const rowBirthdaySet = birthdayMap.get(emp.uid) || new Set();
                const editable = canEdit(emp.uid);
                const isCurrentUser = emp.uid === uid;
                // Feriado municipal da sede do colaborador, somado aos nacionais/móveis.
                const rowHolidaySet = new Set([...nationalHolidaySet, getMunicipalHolidayDDMM(emp.sede, year)]);
                return (
                  <div
                    key={emp.uid}
                    className={`flex items-center group -mx-2 px-2 py-0.5 rounded-lg transition-colors ${
                      isCurrentUser ? "ring-1 ring-gold-mid" : ""
                    }`}
                  >
                    <div
                      title={emp.nome}
                      className={`w-[52px] sm:w-[190px] shrink-0 flex items-center gap-2 pr-0 sm:pr-3 sticky left-0 z-10 ${isCurrentUser ? "bg-gold-light/70" : "bg-white"}`}
                    >
                      <span className="w-7 h-7 shrink-0 rounded-full bg-gold-light text-gold text-[11px] font-semibold flex items-center justify-center">
                        {getInitials(emp.nome)}
                      </span>
                      <div className="min-w-0 hidden sm:block">
                        <div className={`text-sm truncate ${isCurrentUser ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                          {emp.nome}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 gap-x-px h-9 sm:h-7 rounded-lg overflow-hidden bg-gray-50 group-hover:bg-gray-100/70 transition-colors" style={{ minWidth: dayTrackMinWidth }}>
                      {visibleDays.map((dateObj) => {
                        const day = dateObj.getDate();
                        const dayMonth = dateObj.getMonth();
                        const isDispensa = dayMonth === 11 && DISPENSA_DAYS.includes(day);
                        const dateStr = formatDateStr(dateObj);
                        const isChecked = rowSet.has(dateStr);
                        const isBirthday = rowBirthdaySet.has(dateStr);

                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const ddmm = `${pad2(day)}-${pad2(dayMonth + 1)}`;
                        const isHoliday = !isDispensa && rowHolidaySet.has(ddmm);
                        const isToday = dateObj.toDateString() === today.toDateString();

                        if (isDispensa) {
                          return (
                            <div
                              key={dateStr}
                              title={`${pad2(day)}/${pad2(dayMonth + 1)}  -  Dia de dispensa da empresa`}
                              className="flex-1 rounded-md bg-gray-200"
                            />
                          );
                        }

                        // Fins de semana e feriados nunca podem ser marcados de novo, mas um
                        // dia já marcado (ex.: dado antigo) continua a poder ser desmarcado.
                        const blockedReason = isHoliday ? "holiday" : isWeekend ? "weekend" : null;
                        const blockedLabel = blockedReason === "holiday" ? "  -  Feriado" : blockedReason === "weekend" ? "  -  Fim de semana" : "";

                        // Um dia em branco só pode ficar marcado como férias (o dia de
                        // aniversário passa a marcar-se só através da sugestão pós-clique  -
                        // ver handleDayMouseDown/acceptBirthdaySuggestion); um dia já marcado
                        // clica para desmarcar o que já lá está, seja férias ou aniversário.
                        const isMarkedInMode = isChecked || isBirthday;
                        const canToggle = editable && (isMarkedInMode || !blockedReason);
                        const toggleHandler = isBirthday ? toggleBirthdayDay : toggleVacationDay;

                        const statusLabel = isChecked
                          ? "  -  Férias"
                          : isBirthday
                          ? "  -  🎂 Dia de aniversário"
                          : blockedLabel;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            title={`${pad2(day)}/${pad2(dayMonth + 1)}/${dateObj.getFullYear()}${statusLabel}`}
                            disabled={!canToggle}
                            onMouseDown={(e) => { e.preventDefault(); handleDayMouseDown(emp.uid, dateStr, isMarkedInMode, canToggle, toggleHandler, e); }}
                            onMouseEnter={() => handleDayMouseEnter(emp.uid, dateStr, isMarkedInMode, canToggle)}
                            className={[
                              "flex-1 h-full rounded-md transition-colors relative select-none",
                              isChecked ? "bg-gold" : isBirthday ? "bg-rose-400" : isHoliday ? "bg-warning/20" : isWeekend ? "bg-gray-300" : "bg-transparent",
                              canToggle && !isMarkedInMode ? "hover:bg-gold-mid/50 cursor-pointer" : "",
                              canToggle && isMarkedInMode ? "cursor-pointer hover:brightness-110" : "",
                              !canToggle ? "cursor-not-allowed" : "",
                              isToday ? "ring-1 ring-inset ring-gold/60" : "",
                            ].join(" ")}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {birthdaySuggestion && (
        <div
          className="fixed z-[2000] flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm"
          style={{ top: birthdaySuggestion.y + 14, left: birthdaySuggestion.x + 14 }}
        >
          <span className="text-gray-600">🎂 Foi o aniversário?</span>
          <button
            type="button"
            onClick={acceptBirthdaySuggestion}
            className="text-rose-500 font-semibold hover:underline"
          >
            Marcar
          </button>
          <button
            type="button"
            onClick={() => setBirthdaySuggestion(null)}
            title="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// Vista mensal só do colaborador com sessão iniciada, para telemóvel  -  uma
// grelha ao estilo Google Calendar em vez das faixas horizontais da equipa
// (que não cabem bem num ecrã estreito). Reutiliza as mesmas regras de
// marcação/desmarcação da timeline (ver handleDayMouseDown em VacationTimeline).
function MobileMonthCalendar({
  year,
  activeMonth,
  onPrevMonth,
  onNextMonth,
  employee,
  isSelf,
  vacationSet,
  birthdaySet,
  holidaySet,
  editable,
  saldo,
  onDayTap,
}) {
  const weeks = getMonthGridWeeks(year, activeMonth);
  const today = new Date();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-800 leading-tight truncate">
            {isSelf || !employee ? `${MONTH_NAMES[activeMonth]} ${year}` : employee.nome}
          </h3>
          {employee && (
            <p className="text-xs text-gray-400 truncate">
              {!isSelf && `${MONTH_NAMES[activeMonth]} ${year}  -  `}
              {saldo} {saldo === 1 ? "dia disponível" : "dias disponíveis"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
          >
            <FaChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
          >
            <FaChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LETTERS.map((label, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-gray-300 py-1">
            {label[0]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((dateObj) => {
          const inMonth = dateObj.getMonth() === activeMonth;
          const day = dateObj.getDate();
          const dayMonth = dateObj.getMonth();
          const isDispensa = dayMonth === 11 && DISPENSA_DAYS.includes(day);
          const dateStr = formatDateStr(dateObj);
          const isChecked = vacationSet.has(dateStr);
          const isBirthday = birthdaySet.has(dateStr);
          const dayOfWeek = dateObj.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const ddmm = `${pad2(day)}-${pad2(dayMonth + 1)}`;
          const isHoliday = !isDispensa && holidaySet.has(ddmm);
          const isToday = dateObj.toDateString() === today.toDateString();
          const isMarkedInMode = isChecked || isBirthday;
          const blockedReason = isHoliday ? "holiday" : isWeekend ? "weekend" : null;
          const canToggle = editable && !isDispensa && (isMarkedInMode || !blockedReason);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!canToggle}
              onClick={(e) => onDayTap(dateStr, isMarkedInMode, isBirthday, e)}
              className={[
                "aspect-square rounded-lg flex items-center justify-center text-sm relative select-none transition-colors",
                !inMonth ? "text-gray-300" : "text-gray-700",
                isDispensa ? "bg-gray-200" : "",
                isChecked ? "bg-gold text-white font-semibold" : "",
                isBirthday && !isChecked ? "bg-rose-400 text-white font-semibold" : "",
                !isMarkedInMode && !isDispensa && isHoliday ? "bg-warning/20" : "",
                !isMarkedInMode && !isDispensa && !isHoliday && isWeekend ? "bg-gray-50" : "",
                isToday && !isMarkedInMode ? "ring-2 ring-inset ring-gold text-gold font-semibold" : "",
                canToggle ? "cursor-pointer active:scale-95" : "cursor-not-allowed",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-gray-50">
        <LegendDot className="bg-gold" label="Férias" />
        <LegendDot className="bg-rose-400" label="Aniversário" />
        <LegendDot className="bg-warning/40" label="Feriado" />
        <LegendDot className="ring-2 ring-inset ring-gold bg-white" label="Hoje" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <span className={`w-2.5 h-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function ResumoTab({ employees, vacationMap, birthdayMap, year, isAdminOrHR, onQuotaChange, onCarryoverChange, currentUid }) {
  // Ordenação exclusiva desta tabela  -  a timeline mantém sempre a ordem por nome
  // (ver sortedEmployees em VacationTimeline).
  const [sortBy, setSortBy] = useState("nome"); // "nome" | "entidade"

  const sortedEmployees = useMemo(() => {
    if (sortBy !== "entidade") return employees;
    const sorted = [...employees].sort((a, b) => {
      const cmp = (a.entidade || "").localeCompare(b.entidade || "", "pt");
      if (cmp !== 0) return cmp;
      return (a.nome || "").localeCompare(b.nome || "", "pt");
    });
    // O colaborador com sessão iniciada continua sempre em primeiro lugar.
    const currentIndex = sorted.findIndex((e) => e.uid === currentUid);
    return currentIndex > 0
      ? [sorted[currentIndex], ...sorted.slice(0, currentIndex), ...sorted.slice(currentIndex + 1)]
      : sorted;
  }, [employees, sortBy, currentUid]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky top-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b border-gray-100">Colaborador</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === "entidade" ? "nome" : "entidade")}
                  title="Ordenar por entidade"
                  className="inline-flex items-center gap-1.5 font-medium text-gray-500 hover:text-gold transition-colors"
                >
                  Entidade
                  <span className={sortBy === "entidade" ? "text-gold" : "text-gray-300"}>⇅</span>
                </button>
              </th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Dias {year}</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Dias Transitados {year - 1}</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Total Dias</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Dias Marcados</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Dias por utilizar</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">🎂 Aniversário</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((emp, rowIndex) => {
              const usadoAtualLive = vacationMap.get(emp.uid)?.size ?? emp.usadoAtual;
              const saldoLive = emp.quotaAtual + emp.carryoverAtual - usadoAtualLive;
              const birthdaySetLive = birthdayMap.get(emp.uid);
              const birthdayDateLive = birthdaySetLive ? [...birthdaySetLive][0] : emp.birthdayDaysCurrentYear?.[0];
              const isCurrentUser = emp.uid === currentUid;
              return (
                <tr key={emp.uid} className={isCurrentUser ? "bg-gold-light/70" : rowIndex % 2 === 1 ? "bg-gray-50/60" : ""}>
                  <td className="px-4 py-2 whitespace-nowrap border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-gold-light text-gold text-[11px] font-semibold flex items-center justify-center">
                        {getInitials(emp.nome)}
                      </span>
                      <span className={isCurrentUser ? "text-gray-900 font-semibold" : "text-gray-700"}>{emp.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-400 border-b border-gray-50">{emp.entidade || " - "}</td>
                  <td className="px-4 py-2 text-center border-b border-gray-50">
                    {isAdminOrHR ? (
                      <InlineNumberEditor
                        value={emp.quotaAtual}
                        isOverride={emp.quotaOverrideAtual !== null}
                        resetTitle="Repor cálculo automático"
                        onSave={(newQuota) => onQuotaChange(emp.uid, newQuota)}
                      />
                    ) : (
                      <span className="text-gray-700">{emp.quotaAtual}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center border-b border-gray-50">
                    {isAdminOrHR ? (
                      <InlineNumberEditor
                        value={emp.carryoverAtual}
                        isOverride={emp.carryoverOverrideAtual !== null}
                        resetTitle="Repor para 0"
                        onSave={(newDays) => onCarryoverChange(emp.uid, newDays)}
                      />
                    ) : (
                      <span className="text-gray-700">{emp.carryoverAtual}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-700 border-b border-gray-50">{emp.quotaAtual + emp.carryoverAtual}</td>
                  <td className="px-4 py-2 text-center text-gray-700 border-b border-gray-50">{usadoAtualLive}</td>
                  <td className={`px-4 py-2 text-center font-semibold border-b border-gray-50 ${saldoLive < 0 ? "text-danger" : "text-gray-800"}`}>
                    {saldoLive}
                  </td>
                  <td className="px-4 py-2 text-center border-b border-gray-50">
                    {birthdayDateLive ? (
                      <span className="text-rose-500 font-medium">{birthdayDateLive}</span>
                    ) : (
                      <span className="text-gray-400">Disponível</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineNumberEditor({ value, isOverride, resetTitle, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-gray-700 hover:text-gold transition-colors group"
        title="Editar"
      >
        <span className={isOverride ? "font-semibold text-gold" : ""}>{value}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 transition-opacity">✎</span>
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) {
      onSave(parsed);
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="w-14 text-center border border-gold-mid rounded-md py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
      {isOverride && (
        <button
          type="button"
          title={resetTitle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setEditing(false); onSave(null); }}
          className="text-gray-400 hover:text-danger"
        >
          <FaXmark size={12} />
        </button>
      )}
    </div>
  );
}
