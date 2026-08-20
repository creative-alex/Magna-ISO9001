import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

const VacationCalendar = ({ currentUser }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    fetchVacations();
  }, [year]);

  const fetchVacations = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(`/timetracking/all-vacations`, {
        method: "POST",
        body: JSON.stringify({ year }),
      });

      if (response.ok) {
        const data = await response.json();
        // O backend já devolve o "uid" e o "nome" de cada colaborador
        // em cada registo de férias, não é preciso ir buscar à parte.
        setVacations((data.vacations || []).map(v => ({ ...v, userId: v.uid })));
      } else {
        console.error("Erro ao buscar férias:", response.status);
      }
    } catch (err) {
      console.error("Erro ao buscar férias:", err);
    } finally {
      setLoading(false);
    }
  };

  const userNames = vacations.reduce((acc, v) => {
    if (v.uid && v.nome) acc[v.uid] = v.nome;
    return acc;
  }, {});

  const getVacationsByMonth = (month) => {
    return vacations.filter(vacation => {
      const parts = vacation.date.split('-');
      if (parts.length >= 2) {
        const vacMonth = parseInt(parts[1]);
        return vacMonth === month + 1;
      }
      return false;
    });
  };

  const getUserDisplayName = (userId) => {
    // Se tiver o nome mapeado, usar ele
    if (userNames[userId]) {
      return userNames[userId];
    }

    // Caso contrário, formatar o userId: remover "-" e capitalizar cada palavra
    return userId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const groupVacationsByUser = (monthVacations) => {
    const grouped = {};
    monthVacations.forEach(vacation => {
      if (!grouped[vacation.userId]) {
        grouped[vacation.userId] = [];
      }
      grouped[vacation.userId].push(vacation);
    });
    return grouped;
  };

  const formatDateRange = (dates) => {
    if (dates.length === 0) return '';

    // Ordenar datas
    const sortedDates = dates.map(d => {
      const [day, month, year] = d.date.split('-');
      return { day: parseInt(day), month: parseInt(month), year: parseInt(year), original: d.date };
    }).sort((a, b) => a.day - b.day);

    // Agrupar datas consecutivas
    const ranges = [];
    let start = sortedDates[0];
    let end = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
      if (sortedDates[i].day === end.day + 1) {
        end = sortedDates[i];
      } else {
        ranges.push(start.day === end.day ? `${start.day}` : `${start.day}-${end.day}`);
        start = sortedDates[i];
        end = sortedDates[i];
      }
    }
    ranges.push(start.day === end.day ? `${start.day}` : `${start.day}-${end.day}`);

    return ranges.join(', ');
  };

  const renderMonthView = (monthIndex) => {
    const monthVacations = getVacationsByMonth(monthIndex);
    const groupedVacations = groupVacationsByUser(monthVacations);

    // Criar array de todos os dias do mês
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay(); // 0 = Domingo, 1 = Segunda...

    // Dias da semana
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Criar array com células vazias no início para alinhar o primeiro dia
    const calendarDays = [];

    // Adicionar células vazias antes do primeiro dia
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push({ isEmpty: true, key: `empty-${i}` });
    }

    // Adicionar os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, monthIndex, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      calendarDays.push({ day, isWeekend, key: `day-${day}` });
    }

    // Criar mapa de quais usuários têm férias em cada dia
    const vacationsByDay = {};
    monthVacations.forEach(vacation => {
      const day = parseInt(vacation.date.split('-')[0]);
      if (!vacationsByDay[day]) {
        vacationsByDay[day] = [];
      }
      vacationsByDay[day].push(vacation.userId);
    });

    // Normalizar o username do usuário atual
    const normalizedCurrentUser = currentUser
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-");

    const handleDayClick = (day) => {
      // Verificar se o dia já passou ou é hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const clickedDate = new Date(year, monthIndex, day);
      clickedDate.setHours(0, 0, 0, 0);

      if (clickedDate <= today) {
        return; // Não permite selecionar dias passados ou hoje
      }

      const hasUserVacation = vacationsByDay[day]?.includes(normalizedCurrentUser);

      if (!hasUserVacation) {
        // Toggle: adicionar ou remover dia da seleção
        setSelectedDays(prev => {
          const dayKey = `${day}-${monthIndex}-${year}`;
          if (prev.some(d => d.key === dayKey)) {
            return prev.filter(d => d.key !== dayKey);
          } else {
            return [...prev, { day, month: monthIndex, year, key: dayKey }];
          }
        });
      }
    };

    const handleRequestVacations = async () => {
      if (selectedDays.length === 0) {
        alert('Selecione pelo menos um dia');
        return;
      }

      try {
        let successCount = 0;
        let errorCount = 0;

        for (const selectedDay of selectedDays) {
          const dateStr = `${String(selectedDay.day).padStart(2, '0')}-${String(selectedDay.month + 1).padStart(2, '0')}`;

          const response = await apiFetch(`/timetracking/vacation`, {
            method: "POST",
            body: JSON.stringify({ date: dateStr }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        if (errorCount === 0) {
          alert(`${successCount} pedido(s) de férias enviado(s) com sucesso!`);
        } else {
          alert(`${successCount} pedido(s) enviado(s), ${errorCount} erro(s)`);
        }

        setSelectedDays([]);
        fetchVacations();
      } catch (err) {
        console.error('Erro ao enviar pedidos:', err);
        alert('Erro ao enviar pedidos de férias');
      }
    };

    const handleClearSelection = () => {
      setSelectedDays([]);
    };

    const isDaySelected = (day) => {
      const dayKey = `${day}-${monthIndex}-${year}`;
      return selectedDays.some(d => d.key === dayKey);
    };

    return (
      <div className="p-5 bg-white rounded-lg shadow-md max-w-6xl mx-auto relative">
        <div className="flex justify-between items-center mb-5 pb-4 border-b-2 border-gray-200">
          <button
            className="flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 bg-gray-200 text-gray-700 border-none rounded cursor-pointer text-sm md:text-base hover:bg-gray-300 transition-colors"
            onClick={() => setSelectedMonth(null)}
          >
            ← Voltar
          </button>
          <h3 className="m-0 text-lg md:text-2xl text-gray-800">{monthNames[monthIndex]} {year}</h3>
          <div className="w-16 md:w-24"></div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Dom</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Seg</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Ter</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Qua</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Qui</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Sex</div>
          <div className="text-center font-bold text-gray-600 p-2 text-sm">Sáb</div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-5">
          {calendarDays.map((item) => {
            if (item.isEmpty) {
              return <div key={item.key} className=""></div>;
            }

            // Verificar se o dia já passou ou é hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayDate = new Date(year, monthIndex, item.day);
            dayDate.setHours(0, 0, 0, 0);
            const isPastOrToday = dayDate <= today;

            const hasVacations = vacationsByDay[item.day] && vacationsByDay[item.day].length > 0;
            const hasUserVacation = vacationsByDay[item.day]?.includes(normalizedCurrentUser);
            const userCount = hasVacations ? vacationsByDay[item.day].length : 0;
            const isSelected = isDaySelected(item.day);

            let dayClasses = "h-12 md:h-16 rounded-lg flex flex-col items-center justify-center relative border-2 transition-all ";

            if (isPastOrToday) {
              dayClasses += "opacity-50 bg-gray-300 border-transparent cursor-not-allowed ";
            } else if (isSelected) {
              dayClasses += "bg-yellow-200 border-[#b88726] border-[3px] ";
            } else if (hasVacations) {
              dayClasses += "bg-yellow-50 border-[#d29b2f] ";
            } else if (item.isWeekend) {
              dayClasses += "bg-gray-200 border-transparent ";
            } else {
              dayClasses += "bg-gray-50 border-transparent ";
            }

            if (!hasUserVacation && !isPastOrToday) {
              dayClasses += "cursor-pointer hover:scale-105 hover:shadow-md ";
            }

            return (
              <div key={item.key} className="relative group">
                <div
                  className={dayClasses}
                  onClick={() => handleDayClick(item.day)}
                >
                  <div className="text-lg font-bold text-gray-800">{item.day}</div>
                  {hasVacations && (
                    <div className="absolute top-1 right-1 bg-[#d29b2f] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {userCount}
                    </div>
                  )}
                </div>
                {hasVacations && (
                  <div className="pointer-events-none hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20 whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
                    {vacationsByDay[item.day].map(uid => getUserDisplayName(uid)).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lista de férias por dia - visível apenas no mobile */}
        <div className="md:hidden mt-5 mb-5">
          <h4 className="text-lg font-bold text-gray-800 mb-3">Férias do mês:</h4>
          {Object.keys(vacationsByDay).length > 0 ? (
            <div className="space-y-2">
              {Object.keys(vacationsByDay)
                .map(day => parseInt(day))
                .sort((a, b) => a - b)
                .map(day => (
                  <div key={day} className="bg-yellow-50 border border-[#d29b2f] rounded-lg p-3">
                    <div className="font-bold text-gray-800 mb-1">
                      Dia {day} de {monthNames[monthIndex]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {vacationsByDay[day].map(uid => getUserDisplayName(uid)).join(', ')}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sem férias marcadas neste mês</p>
          )}
        </div>

        {/* Barra de ações */}
        {selectedDays.length > 0 && (
          <div className="sticky bottom-0 bg-white p-4 border-t-2 border-gray-200 flex justify-between items-center rounded-b-lg -mx-5 -mb-5 mt-5">
            <span className="text-base font-bold text-gray-800">
              {selectedDays.length} {selectedDays.length === 1 ? 'dia selecionado' : 'dias selecionados'}
            </span>
            <div className="flex gap-3">
              <button
                className="px-5 py-2.5 border-none rounded cursor-pointer text-sm font-medium transition-all bg-gray-600 text-white hover:bg-gray-700"
                onClick={handleClearSelection}
              >
                Limpar Seleção
              </button>
              <button
                className="px-5 py-2.5 border-none rounded cursor-pointer text-sm font-medium transition-all bg-green-600 text-white hover:bg-green-700"
                onClick={handleRequestVacations}
              >
                Enviar marcação de Férias
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-10 text-center text-lg text-gray-600">A carregar calendário de férias...</div>;
  }

  if (selectedMonth !== null) {
    return renderMonthView(selectedMonth);
  }

  return (
    <div className="p-5 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 text-2xl text-gray-800">Calendário de Férias {year}</h2>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 bg-[#d29b2f] text-white border-none rounded cursor-pointer text-lg hover:bg-[#b88726] transition-colors"
            onClick={() => setYear(year - 1)}
          >
            ←
          </button>
          <span className="text-xl font-bold min-w-[60px] text-center">{year}</span>
          <button
            className="px-4 py-2 bg-[#d29b2f] text-white border-none rounded cursor-pointer text-lg hover:bg-[#b88726] transition-colors"
            onClick={() => setYear(year + 1)}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {monthNames.map((monthName, index) => {
          const monthVacations = getVacationsByMonth(index);
          const uniqueUsers = new Set(monthVacations.map(v => v.userId)).size;

          return (
            <div
              key={index}
              className={`p-5 rounded-lg cursor-pointer transition-all border-2 ${
                monthVacations.length > 0
                  ? 'bg-yellow-50 hover:border-[#d29b2f]'
                  : 'bg-gray-50 hover:border-[#d29b2f]'
              } hover:-translate-y-0.5 hover:shadow-lg border-transparent`}
              onClick={() => setSelectedMonth(index)}
            >
              <div className="text-lg font-bold text-gray-800 mb-3">{monthName}</div>
              <div className="flex flex-col gap-1">
                {uniqueUsers > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-[#d29b2f]">{uniqueUsers}</span>
                    <span className="text-sm text-gray-600">
                      {uniqueUsers === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400 italic">Sem férias marcadas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VacationCalendar;
