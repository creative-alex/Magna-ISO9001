import { useState, useEffect } from "react";
import { apiFetch } from "../../../../../shared/utils/apiFetch";
import { calcularHoras, formatarMinutos } from "../../../utils/calcHours";
import RegisterVacation from "../../Shared/vacationButton";
import DeleteRegister from "./deleteRegisterButton";
import MedicalLeave from "../../Shared/medicalLeave";
import BirthdayButton from "../../Shared/birthdayButton";
import { HOLIDAYS_PORTO, getMoveableHolidays } from "../../../../../shared/utils/holidays";




const TableHours = ({ username, month, year, onTotaisChange, onDadosChange }) => {
  const [dados, setDados] = useState([]);
  const [totais, setTotais] = useState({
    totalHoras: "0h 0m",
    totalNormais: "0h 0m",
    totalExtras: "0h 0m",
    diasFalta: 0,
    diasFerias: 0,
    diasBaixaMedica: 0,
    diasAniversario: 0,
  });
  const [editando, setEditando] = useState(null);
  const [novoValor, setNovoValor] = useState("");
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (!username || !month || !year) return;
    fetchData();
  }, [username, month, year]);

  // Fechar context menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu && !event.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);
  

  const fetchData = async () => {
    try {
      const response = await apiFetch(`/timetracking/calendar`, {
        method: "POST",
        body: JSON.stringify({ uid: username, month, year }),
      });

      const diasNoMes = new Date(year, month, 0).getDate();
      let totalMinutos = 0;
      let totalMinutosNormais = 0;
      let totalMinutosExtras = 0;

      let novosDados = Array.from({ length: diasNoMes }, (_, i) => ({
        dia: `${String(i + 1).padStart(2, "0")}-${String(month).padStart(2, "0")}`,
        horaEntrada: "-",
        horaSaida: "-",
        total: "-",
        extra: "-",
        isFerias: false,
        isBaixaMedica: false,
        isAniversario: false,
      }));

      const data = response.ok ? await response.json() : { registos: [] };
      const registos = Array.isArray(data.registos) ? data.registos : [];

      // Processar férias aprovadas
      const ferias = Array.isArray(data.ferias)
        ? data.ferias
            .filter(f => f.approved === true)
            .map(f => {
              const dateStr = f.date;
              if (dateStr.length === 10 && dateStr[2] === "-") {
                return dateStr.slice(0, 5);
              }
              if (dateStr.length === 10 && dateStr[4] === "-") {
                return dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7);
              }
              return dateStr;
            })
        : [];

      // Processar baixas médicas aprovadas
      const baixas = Array.isArray(data.baixas)
        ? data.baixas
            .filter(b => b.approved === true)
            .map(b => {
              const dateStr = b.date;
              if (dateStr.length === 10 && dateStr[2] === "-") {
                return dateStr.slice(0, 5);
              }
              if (dateStr.length === 10 && dateStr[4] === "-") {
                return dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7);
              }
              return dateStr;
            })
        : [];

      // Processar dias de aniversário aprovados
      const aniversarios = Array.isArray(data.aniversario)
        ? data.aniversario
            .filter(a => a.approved === true)
            .map(a => {
              const dateStr = a.date;
              if (dateStr.length === 10 && dateStr[2] === "-") {
                return dateStr.slice(0, 5);
              }
              if (dateStr.length === 10 && dateStr[4] === "-") {
                return dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7);
              }
              return dateStr;
            })
        : [];

      const hoje = new Date();
      const allHolidays = [...HOLIDAYS_PORTO, ...getMoveableHolidays(year)];
      novosDados = novosDados.map((item, index) => {
        const registo = registos.find((r) => {
          const registoData = new Date(r.timestamp);
          return registoData.getDate() === index + 1 && registoData.getMonth() + 1 === month;
        });

        const dataAtual = new Date(year, month - 1, index + 1);
        const diaSemana = dataAtual.getDay();
        const feriado = allHolidays.includes(item.dia);

        // Verificar se o dia está marcado como férias, baixa médica ou aniversário
        const estaDeFerias = ferias.includes(item.dia);
        const estaDeBaixaMedica = baixas.includes(item.dia);
        const estaDeAniversario = aniversarios.includes(item.dia);

        if (estaDeAniversario) {
          return {
            ...item,
            horaEntrada: "🎂 Aniversário",
            horaSaida: "🎂 Aniversário",
            total: "Aniversário",
            extra: "Aniversário",
            isAniversario: true,
          };
        }

        if (estaDeFerias) {
          return {
            ...item,
            horaEntrada: "Férias",
            horaSaida: "Férias",
            total: "Férias",
            extra: "Férias",
            isFerias: true,
          };
        }

        if (estaDeBaixaMedica) {
          return {
            ...item,
            horaEntrada: "Baixa Médica",
            horaSaida: "Baixa Médica",
            total: "Baixa Médica",
            extra: "Baixa Médica",
            isBaixaMedica: true,
          };
        }
      
        // Caso exista um registro, exibir os dados do registro
        if (registo) {
          // Verificar se é férias ou baixa médica pelo status ou pelas horas especiais
          if (registo.status === "Férias" || registo.horaEntrada === "Férias") {
            return {
              ...item,
              horaEntrada: "Férias",
              horaSaida: "Férias",
              total: "Férias",
              extra: "Férias",
              isFerias: true,
            };
          }
          
          if (registo.status === "Baixa Médica" || registo.horaEntrada === "Baixa") {
            return {
              ...item,
              horaEntrada: "Baixa Médica",
              horaSaida: "Baixa Médica",
              total: "Baixa Médica",
              extra: "Baixa Médica",
              isBaixaMedica: true,
            };
          }
          
          // Caso seja um registo normal de trabalho
          const { total, extra, minutos, minutosExtras } = calcularHoras(registo.horaEntrada, registo.horaSaida, dataAtual);
          totalMinutos += minutos;
          totalMinutosNormais += minutos;
          totalMinutosExtras += minutosExtras;
          return {
            ...item,
            horaEntrada: registo.horaEntrada || "-",
            horaSaida: registo.horaSaida || "-",
            total,
            extra,
          };
        }
      
        // Caso não seja feriado, exibir como falta
        if (
          dataAtual < hoje &&
          dataAtual.toDateString() !== hoje.toDateString() &&
          diaSemana !== 0 &&
          diaSemana !== 6 &&
          !feriado
        ) {
          return { ...item, horaEntrada: "-", horaSaida: "-", total: "0h 0m", extra: "0h 0m" };
        }
      
        return item;
      });

      const diasFalta = novosDados.filter((d) => d.total === "0h 0m" && !d.isFerias && !d.isBaixaMedica && !d.isAniversario).length;
      const diasFerias = novosDados.filter((d) => d.isFerias).length;
      const diasBaixaMedica = novosDados.filter((d) => d.isBaixaMedica).length;
      const diasAniversario = novosDados.filter((d) => d.isAniversario).length;

      const novosTotais = {
        totalHoras: formatarMinutos(totalMinutos + totalMinutosExtras),
        totalNormais: formatarMinutos(totalMinutosNormais),
        totalExtras: formatarMinutos(totalMinutosExtras),
        diasFalta,
        diasFerias,
        diasBaixaMedica,
        diasAniversario,
      };

      setTotais(novosTotais);
      setDados(novosDados);

      if (onTotaisChange) {
        onTotaisChange(novosTotais);
      }
      if (onDadosChange) {
        onDadosChange(novosDados);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar horários:", error);
      setTotais({
        totalHoras: "0h 0m",
        totalNormais: "0h 0m",
        totalExtras: "0h 0m",
        diasFalta: 0,
        diasFerias: 0,
        diasBaixaMedica: 0,
        diasAniversario: 0,
      });
    }
  };

  const ativarEdicao = (index, campo, valorAtual) => {
    setEditando({ index, campo });
    setNovoValor(valorAtual === "-" ? "" : valorAtual);
  };
  const salvarEdicao = async (index) => {
    if (!novoValor) return;

    const novoDados = [...dados];
    novoDados[index][editando.campo] = novoValor;
    setDados(novoDados);

    try {
      const response = await apiFetch(`/timetracking/update-time`, {
        method: "POST",
        body: JSON.stringify({
          uid: username,
          date: novoDados[index].dia,
          month: month,
          year: year,
          campo: editando.campo,
          valor: novoValor
        }),
      });


      // Recarregar os dados após salvar a edição
      await fetchData();
    } catch (error) {
      console.error("❌ Erro ao atualizar hora:", error);
    }

    setEditando(null);
  };
  const abrirContextMenu = (event, index) => {
    event.preventDefault();

    // Dimensões do menu (ajusta se mudares o CSS)
    const menuWidth = 180;
    const menuHeight = 160;

    // Posição do clique
    let x = event.clientX;
    let y = event.clientY;

    // Ajusta se sair fora do ecrã
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      x,
      y,
      index,
      dia: dados[index].dia,
      isFerias: dados[index].isFerias,
      isAniversario: dados[index].isAniversario
    });
  };
    
  return (
    <>
    {contextMenu && (
      <div
        className="context-menu fixed z-[1000] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-2 min-w-[180px] bg-[#2c2c2c] border border-[#ccc]"
        style={{
          top: `${contextMenu.y}px`,
          left: `${contextMenu.x}px`,
        }}
      >
        <div className="flex flex-col gap-1 [&_button]:w-full [&_button]:bg-transparent [&_button]:border-none [&_button]:text-gold [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:cursor-pointer [&_button]:rounded [&_button]:text-left [&_button]:transition-colors [&_button]:duration-200 [&_button:hover]:bg-gold-light [&_button:hover]:text-white">
          <RegisterVacation username={username} date={contextMenu.dia} onSuccess={fetchData} />
          <MedicalLeave username={username} date={contextMenu.dia} onSuccess={fetchData} />
          <BirthdayButton
            username={username}
            date={`${contextMenu.dia}-${year}`}
            isMarked={contextMenu.isAniversario}
            onSuccess={fetchData}
          />
          <DeleteRegister username={username} date={contextMenu.dia} onSuccess={fetchData} />
        </div>
      </div>
    )}

      <div className="overflow-x-auto w-full max-h-[540px] overflow-y-auto">
        <table className="w-full border-collapse text-[0.9rem] bg-white">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200 sticky top-0 bg-white">Data</th>
              <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200 sticky top-0 bg-white">Hora Entrada</th>
              <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200 sticky top-0 bg-white">Hora Saída</th>
              <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200 sticky top-0 bg-white">Total Horas Trabalhadas</th>
              {/*<th>Horas Extra</th>*/}
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => {
              const isLessThanEightHours = item.total !== "-" && parseInt(item.total.split("h")[0]) < 8;

              return (
                <tr key={index} onContextMenu={(e) => abrirContextMenu(e, index)} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3 text-left border-b border-gray-200">{(() => {
                    // Força o formato DD-MM
                    if (typeof item.dia === 'string') {
                      // Se vier no formato ISO ou com hora, extrai só o dia e mês
                      const match = item.dia.match(/(\d{4})-(\d{2})-(\d{2})/);
                      if (match) {
                        return `${match[3]}-${match[2]}`;
                      }
                      // Se vier já como DD-MM
                      if (/^\d{2}-\d{2}$/.test(item.dia)) {
                        return item.dia;
                      }
                    }
                    return item.dia;
                  })()}</td>
                  <td className="px-4 py-3 text-left border-b border-gray-200 cursor-pointer" onClick={() => ativarEdicao(index, "horaEntrada", item.horaEntrada)}>
                    {editando?.index === index && editando?.campo === "horaEntrada" ? (
                      <input
                        type="time"
                        className="border border-gold rounded px-2 py-1 text-sm"
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                        onBlur={() => salvarEdicao(index)}
                        onKeyDown={(e) => e.key === "Enter" && salvarEdicao(index)}
                        autoFocus
                      />
                    ) : (
                      item.horaEntrada
                    )}
                  </td>
                  <td className="px-4 py-3 text-left border-b border-gray-200 cursor-pointer" onClick={() => ativarEdicao(index, "horaSaida", item.horaSaida)}>
                    {editando?.index === index && editando?.campo === "horaSaida" ? (
                      <input
                        type="time"
                        className="border border-gold rounded px-2 py-1 text-sm"
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                        onBlur={() => salvarEdicao(index)}
                        onKeyDown={(e) => e.key === "Enter" && salvarEdicao(index)}
                        autoFocus
                      />
                    ) : (
                      item.horaSaida
                    )}
                  </td>
                  <td className={`px-4 py-3 text-left border-b border-gray-200 ${isLessThanEightHours ? "text-danger font-semibold" : ""}`}>{item.total}</td>
                  {/*<td>{item.extra}</td>*/}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TableHours;
