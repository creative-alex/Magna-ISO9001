import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaXmark,
  FaChevronLeft,
  FaChevronRight,
  FaUmbrellaBeach,
} from "react-icons/fa6";
import { apiFetch } from "../../utils/apiFetch";
import { UserContext } from "../../context/userContext";
import { HOLIDAYS_PORTO, getMoveableHolidays } from "../../utils/timeTracking/constants";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DISPENSA_DAYS = [24, 31]; // Dezembro: dias de dispensa da empresa, não contam como férias
// 24 e 31 de dezembro já são tratados à parte como "dispensa", por isso saem
// daqui para não aparecerem duplicados como "feriado" e "dispensa" ao mesmo tempo.
const FIXED_HOLIDAYS_DDMM = HOLIDAYS_PORTO.filter((ddmm) => ddmm !== "24-12" && ddmm !== "31-12");

function pad2(n) {
  return String(n).padStart(2, "0");
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
  const [dayMode, setDayMode] = useState("ferias"); // "ferias" | "aniversario"  -  o que o clique num dia marca, na timeline
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());

  const loadMap = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/timetracking/vacation-map", {
        method: "POST",
        body: JSON.stringify({ year }),
      });
      if (!response.ok) throw new Error("Falha ao carregar o mapa de férias");
      const data = await response.json();
      const sorted = [...(data.employees || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
      setEmployees(sorted);
      setVacationMap(buildVacationMap(sorted));
      setBirthdayMap(buildBirthdayMap(sorted));
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

  const holidaySet = useMemo(
    () => new Set([...FIXED_HOLIDAYS_DDMM, ...getMoveableHolidays(year)]),
    [year]
  );

  const canEdit = (rowUid) => rowUid === uid || isAdminOrHR;

  const goToMonth = (delta) => {
    let nextMonth = activeMonth + delta;
    if (nextMonth < 0) { nextMonth = 11; onYearChange(year - 1); }
    else if (nextMonth > 11) { nextMonth = 0; onYearChange(year + 1); }
    setActiveMonth(nextMonth);
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

  const daysInMonth = new Date(year, activeMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gold-light text-gold flex items-center justify-center shrink-0">
            <FaUmbrellaBeach size={16} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 leading-tight">Mapa de Férias</h2>
            <p className="text-xs text-gray-400">Consulta e gestão dos dias de férias da equipa</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === "timeline" && (
            <div className="flex items-center gap-1 bg-gray-50 rounded-full border border-gray-100 p-1">
              <button
                onClick={() => setDayMode("ferias")}
                title="Clicar num dia marca/desmarca férias"
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  dayMode === "ferias" ? "bg-gold text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Férias
              </button>
              <button
                onClick={() => setDayMode("aniversario")}
                title="Clicar num dia marca/desmarca o dia de aniversário (1/ano)"
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  dayMode === "aniversario" ? "bg-rose-400 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                🎂 Aniversário
              </button>
            </div>
          )}
          {viewMode === "timeline" ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToMonth(-1)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronLeft size={12} />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                {MONTH_NAMES[activeMonth]} {year}
              </span>
              <button
                onClick={() => goToMonth(1)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold-light rounded-full transition-colors"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
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
          <div className="flex items-center gap-1 bg-gray-50 rounded-full border border-gray-100 p-1">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === "timeline" ? "bg-gold text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Linha do tempo
            </button>
            <button
              onClick={() => setViewMode("resumo")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === "resumo" ? "bg-gold text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Resumo
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {viewMode === "resumo" ? (
          <ResumoTab
            employees={employees}
            vacationMap={vacationMap}
            birthdayMap={birthdayMap}
            year={year}
            isAdminOrHR={isAdminOrHR}
            onQuotaChange={updateQuotaOverride}
            onCarryoverChange={updateCarryover}
            currentUid={uid}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            {/* Régua de dias, alinhada com as faixas de cada colaborador em baixo */}
            <div className="flex mb-1.5">
              <div className="w-[190px] shrink-0" />
              <div className="flex flex-1">
                {days.map((day) => {
                  const isToday = day === today.getDate() && activeMonth === today.getMonth() && year === today.getFullYear();
                  return (
                    <div key={day} className="flex-1 text-center">
                      <span className={`text-[10px] font-medium ${isToday ? "text-gold" : "text-gray-300"}`}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {employees.map((emp) => {
                const rowSet = vacationMap.get(emp.uid) || new Set();
                const rowBirthdaySet = birthdayMap.get(emp.uid) || new Set();
                const editable = canEdit(emp.uid);
                const isCurrentUser = emp.uid === uid;
                return (
                  <div
                    key={emp.uid}
                    className={`flex items-center group -mx-2 px-2 py-0.5 rounded-lg transition-colors ${
                      isCurrentUser ? "bg-gold-light/70 ring-1 ring-gold-mid" : ""
                    }`}
                  >
                    <div className="w-[190px] shrink-0 flex items-center gap-2 pr-3">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-gold-light text-gold text-[11px] font-semibold flex items-center justify-center">
                        {getInitials(emp.nome)}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-sm truncate ${isCurrentUser ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                          {emp.nome}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 h-7 rounded-lg overflow-hidden bg-gray-50 group-hover:bg-gray-100/70 transition-colors">
                      {days.map((day) => {
                        const isDispensa = activeMonth === 11 && DISPENSA_DAYS.includes(day);
                        const dateStr = `${pad2(day)}-${pad2(activeMonth + 1)}-${year}`;
                        const isChecked = rowSet.has(dateStr);
                        const isBirthday = rowBirthdaySet.has(dateStr);

                        const prevDateStr = day > 1 ? `${pad2(day - 1)}-${pad2(activeMonth + 1)}-${year}` : null;
                        const nextDateStr = day < daysInMonth ? `${pad2(day + 1)}-${pad2(activeMonth + 1)}-${year}` : null;
                        const prevChecked = prevDateStr ? rowSet.has(prevDateStr) : false;
                        const nextChecked = nextDateStr ? rowSet.has(nextDateStr) : false;

                        const dayOfWeek = new Date(year, activeMonth, day).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const ddmm = `${pad2(day)}-${pad2(activeMonth + 1)}`;
                        const isHoliday = !isDispensa && holidaySet.has(ddmm);
                        const isToday = day === today.getDate() && activeMonth === today.getMonth() && year === today.getFullYear();

                        if (isDispensa) {
                          return (
                            <div
                              key={day}
                              title={`${pad2(day)}/${pad2(activeMonth + 1)}  -  Dia de dispensa da empresa`}
                              className="flex-1 bg-gray-200"
                            />
                          );
                        }

                        // Fins de semana e feriados nunca podem ser marcados de novo, mas um
                        // dia já marcado (ex.: dado antigo) continua a poder ser desmarcado.
                        const blockedReason = isHoliday ? "holiday" : isWeekend ? "weekend" : null;
                        const blockedLabel = blockedReason === "holiday" ? "  -  Feriado nacional" : blockedReason === "weekend" ? "  -  Fim de semana" : "";

                        // O clique marca férias ou dia de aniversário, segundo o modo ativo;
                        // o dia de aniversário tem quota fixa de 1/ano (sem transição).
                        const isMarkedInMode = dayMode === "ferias" ? isChecked : isBirthday;
                        const quotaExhausted = dayMode === "aniversario" && !isBirthday && rowBirthdaySet.size >= 1;
                        const canToggle = editable && (isMarkedInMode || (!blockedReason && !quotaExhausted));
                        const toggleHandler = dayMode === "ferias" ? toggleVacationDay : toggleBirthdayDay;

                        const statusLabel = isChecked
                          ? "  -  Férias"
                          : isBirthday
                          ? "  -  🎂 Dia de aniversário"
                          : quotaExhausted
                          ? "  -  Dia de aniversário já utilizado este ano"
                          : blockedLabel;

                        return (
                          <button
                            key={day}
                            type="button"
                            title={`${pad2(day)}/${pad2(activeMonth + 1)}/${year}${statusLabel}`}
                            disabled={!canToggle}
                            onClick={() => toggleHandler(emp.uid, dateStr)}
                            className={[
                              "flex-1 h-full transition-colors relative",
                              isChecked ? "bg-gold" : isBirthday ? "bg-rose-400" : isHoliday ? "bg-warning/20" : isWeekend ? "bg-gray-100" : "bg-transparent",
                              isChecked && !prevChecked ? "rounded-l-full" : "",
                              isChecked && !nextChecked ? "rounded-r-full" : "",
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
        )}
      </div>
    </div>
  );
}

function ResumoTab({ employees, vacationMap, birthdayMap, year, isAdminOrHR, onQuotaChange, onCarryoverChange, currentUid }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky top-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b border-gray-100">Colaborador</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b border-gray-100">Entidade</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Transição {year - 1}</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Quota {year}</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Usado {year}</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">Por usar</th>
              <th className="sticky top-0 bg-gray-50 px-4 py-3 font-medium text-gray-500 border-b border-gray-100">🎂 Aniversário</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, rowIndex) => {
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
                        value={emp.carryoverAtual}
                        isOverride={emp.carryoverOverrideAtual !== null}
                        resetTitle="Repor para 0"
                        onSave={(newDays) => onCarryoverChange(emp.uid, newDays)}
                      />
                    ) : (
                      <span className="text-gray-700">{emp.carryoverAtual}</span>
                    )}
                  </td>
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
