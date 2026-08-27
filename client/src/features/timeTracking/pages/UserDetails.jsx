import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { FaUser, FaCalendarDays } from "react-icons/fa6";
import { apiFetch } from '../../utils/apiFetch';
import { UserContext } from '../../context/userContext';
import LoadingSpinner from '../../components/TimeTracking/Shared/loadingSpinner';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import TableHours from '../../components/TimeTracking/Admin/clients/pontoTable';
import UserStats from '../../components/TimeTracking/Admin/clients/userStats';

const GOLD = "#C8932F";

const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" };
const cardHeaderStyle = { padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 };
const inputStyle = {
  width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
  border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
  outline: "none", background: "#fafafa", boxSizing: "border-box",
};
const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };
const valueStyle = { fontSize: 13, color: "#111827", fontWeight: 500 };
const btnOutline = (color) => ({ padding: "7px 16px", fontSize: 12.5, fontWeight: 500, borderRadius: 999, border: `1.5px solid ${color}`, color, background: "transparent", cursor: "pointer" });
const btnSolid = { padding: "8px 20px", fontSize: 12.5, fontWeight: 500, borderRadius: 999, border: "none", color: "#fff", background: GOLD, cursor: "pointer" };
const btnGhost = { padding: "8px 20px", fontSize: 12.5, fontWeight: 500, borderRadius: 999, border: "1px solid #e5e7eb", color: "#6b7280", background: "transparent", cursor: "pointer" };

const UserDetails = ({ selectedUser }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDetails, setShowDetails] = useState(true);
  const [totais, setTotais] = useState(null);
  const [totaisAnuais, setTotaisAnuais] = useState(null);
  const [feriasPendentes, setFeriasPendentes] = useState([]);
  const navigate = useNavigate(); // Obtém a função navigate
  const location = useLocation();
  const { uid: uidParam } = useParams();
  const [dados, setDados] = useState([]);
  const { username, nivelAcesso: actorNivelAcesso } = useContext(UserContext);
  // Um Administrador só gere colaboradores da sua própria entidade e nunca pode
  // atribuir/manter um nível de acesso igual ou superior ao seu  -  o backend também
  // impõe isto (updateUserDetails), mas o formulário fica coerente com o que é aceite.
  const isAdministrador = actorNivelAcesso === "Administrador";

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  // Dividir o caminho em segmentos
  const pathSegments = location.pathname
    .split("/")
    .filter((segment) => segment); // Remove segmentos vazios

  // Pega o uid do parâmetro da rota, depois do selectedUser, depois do localStorage (legado)
  const userName = uidParam || selectedUser?.uid || localStorage.getItem("selectedUserUID");

  // Guarda o uid no localStorage quando selectedUser mudar
  useEffect(() => {
    if (selectedUser?.uid) {
      localStorage.setItem("selectedUserUID", selectedUser.uid);
    } else if (!localStorage.getItem("selectedUserUID")) {
      console.error("❌ Nenhum userName disponível!");
    }
  }, [selectedUser]);

  useEffect(() => {

    if (!userName) {
      return;
    }

    // 🔴 Resetando os estados ao mudar de utilizador ou ano
    setShowMonths(false);
    setSelectedMonth(null);

    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`/timetracking/userDetails`, {
          method: "POST",
          body: JSON.stringify({ uid: userName }),
        });

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(errorMessage || "Erro ao buscar dados do user");
        }

        const data = await response.json();


        setUserDetails(data);
        setEditedData({ ...data, oldNome: data.nome });

        // Buscar férias pendentes
        await fetchFeriasPendentes();

        // Buscar totais anuais
        await fetchTotaisAnuais();

      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userName, selectedYear ]);

  const fetchFeriasPendentes = async () => {
    try {
      // Usar o novo endpoint específico para férias pendentes
      const response = await apiFetch(`/timetracking/pending-vacations`, {
        method: "POST",
        body: JSON.stringify({ uid: userName, year: selectedYear }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeriasPendentes(data.feriasPendentes || []);
      } else {
        setFeriasPendentes([]);
      }
    } catch (err) {
      setFeriasPendentes([]);
    }
  };

  const fetchTotaisAnuais = async () => {
    try {
      // Buscar dados de horas extras do ano todo
      const overtimeResponse = await apiFetch(`/timetracking/overtime-summary`, {
        method: "POST",
        body: JSON.stringify({ uid: userName, year: selectedYear }),
      });

      let totalHoras = "0h 0m";
      let totalExtras = "0h 0m";

      if (overtimeResponse.ok) {
        const overtimeData = await overtimeResponse.json();
        // Calcular total de horas normais a partir dos dados mensais
        const totalMinutosNormais = overtimeData.monthlyOvertime?.reduce((acc, month) => {
          const horas = parseInt(month.totalHours?.split('h')[0] || 0);
          const minutos = parseInt(month.totalHours?.split(' ')[1]?.split('m')[0] || 0);
          return acc + horas * 60 + minutos;
        }, 0) || 0;

        const formatarMinutos = (minutos) => {
          const horas = Math.floor(minutos / 60);
          const mins = minutos % 60;
          return `${horas}h ${mins}m`;
        };

        totalHoras = formatarMinutos(totalMinutosNormais);
        totalExtras = overtimeData.totalOvertimeHours || "0h 0m";
      }

      // Buscar dados de férias, faltas e baixas médicas do ano todo
      const yearlyResponse = await apiFetch(`/timetracking/yearly-summary`, {
        method: "POST",
        body: JSON.stringify({ uid: userName, year: selectedYear }),
      });

      let diasFalta = 0;
      let diasFerias = 0;
      let diasBaixaMedica = 0;

      if (yearlyResponse.ok) {
        const yearlyData = await yearlyResponse.json();
        diasFalta = yearlyData.diasFalta || 0;
        diasFerias = yearlyData.diasFerias || 0;
        diasBaixaMedica = yearlyData.diasBaixaMedica || 0;

      }

      const totaisAnuais = {
        totalHoras,
        totalExtras,
        diasFalta,
        diasFerias,
        diasBaixaMedica,
      };

      setTotaisAnuais(totaisAnuais);
    } catch (err) {
      console.error("Erro ao buscar totais anuais:", err);
    }
  };

  const handleApproveVacation = async (date) => {
    try {
      const response = await apiFetch(`/timetracking/approve-vacation`, {
        method: "POST",
        body: JSON.stringify({ uid: userName, date }),
      });

      if (response.ok) {
        await fetchFeriasPendentes(); // Recarregar a lista
        await fetchTotaisAnuais(); // Recalcular totais anuais
      } else {
      }
    } catch (err) {
      console.error("Erro ao aprovar férias:", err);
      alert("Erro ao aprovar férias.");
    }
  };

  const handleRejectVacation = async (date) => {
    try {
      const response = await apiFetch(`/timetracking/reject-vacation`, {
        method: "POST",
        body: JSON.stringify({ uid: userName, date }),
      });

      if (response.ok) {
        await fetchFeriasPendentes();
        await fetchTotaisAnuais();
        alert("Férias rejeitadas com sucesso!");
      } else {
        alert("Erro ao rejeitar férias.");
      }
    } catch (err) {
      console.error("Erro ao rejeitar férias:", err);
      alert("Erro ao rejeitar férias.");
    }
  };


  const handleShowTimeLine = () => {
    setShowMonths(true);
  };

  const handleDeleteClick = async () => {
    const confirmDelete = window.confirm("Tem a certeza que deseja apagar este colaborador? Esta ação não pode ser desfeita.");

    if (!confirmDelete) {
      return; // Se o colaborador cancelar, interrompe a execução
    }

    try {
      const response = await apiFetch(`/timetracking/deleteUser`, {
        method: "POST",
        body: JSON.stringify({ uid: userName }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Erro ao apagar user");
      }

      navigate(-1);
    } catch (err) {
    }
  };

  const handleSelectMonth = (month) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMonth(null); // Reset month when year changes
    setTotais(null); // Reset totals
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedData(userDetails);
  };

  const handleInputChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const normalizeName = (name) => {
    if (!name) return ""; // Retorna uma string vazia se o nome for undefined ou null
    return name
      .trim()
      .replace(/\s+/g, "-") // Substitui espaços por "-"
      .replace(/[^a-zA-Z0-9-]/g, ""); // Remove caracteres inválidos
  };


  const handleSubmitClick = async () => {
    try {
      // Criar uma cópia dos dados editados e substituir "&" por "e" em todas as strings
      const sanitizedData = { ...editedData };

      console.log("🔍 Dados originais antes da sanitização:", editedData);

      // Substituir "&" por "e" em todos os campos string
      Object.keys(sanitizedData).forEach(key => {
        if (typeof sanitizedData[key] === 'string') {
          const originalValue = sanitizedData[key];
          sanitizedData[key] = sanitizedData[key].replace(/&/g, 'e');

          // Log apenas se houve mudança
          if (originalValue !== sanitizedData[key]) {
            console.log(`🔄 Campo "${key}": "${originalValue}" → "${sanitizedData[key]}"`);
          }
        }
      });

      console.log("✅ Dados sanitizados que serão enviados:", sanitizedData);

      const dataToSend = {
        ...sanitizedData,
        uid: userDetails?.uid || localStorage.getItem("selectedUserUID"),
      };


      const response = await apiFetch(`/timetracking/updateUserDetails`, {
        method: "POST",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) throw new Error("Erro ao atualizar user");

      const updatedData = await response.json();
      setIsEditing(false);
      setUserDetails(updatedData);

      // Atualiza o localStorage com o novo nome do colaborador
      localStorage.setItem("selectedUserUID", updatedData.uid);

      // Verifica se o nome ou entidade mudou
      if (updatedData.nome !== userDetails.nome || updatedData.entidade !== userDetails.entidade) {
        const normalizedEntityName = normalizeName(updatedData.entidade);
        navigate(`/ponto/entidades/${normalizedEntityName}`);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Erro ao atualizar os dados do colaborador:", err.message);
      setError(err.message);
    }
  };


const handleTotaisChange = (novosTotais) => {
  setTotais(novosTotais);
};

const handleDadosChange = (novosDados) => {
  setDados(novosDados); // Atualiza os dados no estado
  // Recarregar férias pendentes quando os dados mudarem
  fetchFeriasPendentes();
};

// Normalizar entidade para URL (usar no breadcrumb)
const normalizedEntityUrl = userDetails?.entidade
  ? userDetails.entidade
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), '')
      .replace(/&/g, 'e')
      .replace(/-/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  : '';

  if (!username) {
    return <LoadingSpinner />;
  }

  const selectStyle = { ...inputStyle, cursor: "pointer" };

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="👤" title="Colaborador" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {loading ? (
            <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>A carregar colaborador...</p>
            </div>
          ) : error ? (
            <div style={{ ...cardStyle, padding: "18px 24px" }}>
              <p style={{ color: "#E86F51", fontWeight: 500, fontSize: 13, margin: 0 }}>⚠ Erro: {error.message}</p>
            </div>
          ) : !showDetails ? null : (
            <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: "calc(100vh - 102px)" }}>
              <div className="flex-1 flex flex-col gap-5 min-w-0">
                <div style={cardStyle}>
                  <div style={{ ...cardHeaderStyle, gap: 12 }}>
                    <FaUser style={{ color: GOLD, fontSize: 13, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1, minWidth: 0, textTransform: "capitalize" }} className="truncate">
                      <Link to="/ponto/entidades" style={{ color: "#9ca3af", textDecoration: "none", fontWeight: 500 }}>Entidades</Link>
                      <span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span>
                      <Link to={`/ponto/entidades/${normalizedEntityUrl}`} style={{ color: "#9ca3af", textDecoration: "none", fontWeight: 500 }}>
                        {userDetails?.entidade}
                      </Link>
                      <span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span>
                      {userDetails?.nome || "N/A"}
                    </span>

                    {!isEditing && (
                      <button style={btnOutline(GOLD)} onClick={handleEditClick}>Editar</button>
                    )}
                  </div>

                  <div style={{ padding: 18 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <span style={labelStyle}>Nome</span>
                          <input type="text" name="nome" style={inputStyle} value={editedData?.nome || ""} onChange={handleInputChange} />
                        </div>
                        <div>
                          <span style={labelStyle}>Email</span>
                          <input type="email" name="email" style={inputStyle} value={editedData?.email || ""} onChange={handleInputChange} />
                        </div>
                        <div>
                          <span style={labelStyle}>Entidade</span>
                          <input
                            type="text"
                            style={{ ...inputStyle, ...(isAdministrador ? { cursor: "not-allowed", opacity: 0.7 } : {}) }}
                            value={editedData?.entidade || ""}
                            onChange={(e) => setEditedData({ ...editedData, entidade: e.target.value })}
                            disabled={isAdministrador}
                          />
                        </div>
                        <div>
                          <span style={labelStyle}>Função</span>
                          <input type="text" name="role" style={inputStyle} value={editedData?.role || ""} onChange={handleInputChange} />
                        </div>
                        <div>
                          <span style={labelStyle}>Nível de acesso</span>
                          <select name="nivelAcesso" style={selectStyle} value={editedData?.nivelAcesso || "Colaborador"} onChange={handleInputChange}>
                            <option value="Colaborador">Colaborador</option>
                            {!isAdministrador && <option value="Administrador">Administrador</option>}
                            {!isAdministrador && <option value="GestorRH">Gestor(a) de Recursos Humanos</option>}
                            {!isAdministrador && <option value="SuperAdmin">SuperAdmin</option>}
                          </select>
                        </div>
                        <div>
                          <span style={labelStyle}>Nova Password Temporária</span>
                          <input
                            type="password"
                            name="newPassword"
                            style={inputStyle}
                            minLength="6"
                            autoComplete="new-password"
                            value={editedData?.newPassword || ""}
                            onChange={handleInputChange}
                            placeholder="Deixar em branco para não alterar"
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={btnSolid} onClick={handleSubmitClick}>Submeter</button>
                            <button style={btnGhost} onClick={handleCancelClick}>Cancelar</button>
                          </div>
                          <button style={btnOutline("#E86F51")} onClick={handleDeleteClick}>Apagar Utilizador</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                        <div>
                          <span style={labelStyle}>Nome</span>
                          <div style={valueStyle}>{userDetails.nome || "N/A"}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={labelStyle}>Email</span>
                          <div style={{ ...valueStyle }} className="truncate">{userDetails.email || "N/A"}</div>
                        </div>
                        <div>
                          <span style={labelStyle}>Entidade</span>
                          <div style={valueStyle}>{userDetails.entidade || "N/A"}</div>
                        </div>
                        <div>
                          <span style={labelStyle}>Função</span>
                          <div style={valueStyle}>{userDetails.role || "N/A"}</div>
                        </div>
                        <div>
                          <span style={labelStyle}>Nível de acesso</span>
                          <div style={valueStyle}>{userDetails.nivelAcesso || "Colaborador"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ ...cardStyle, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={cardHeaderStyle}>
                    <FaCalendarDays style={{ color: GOLD, fontSize: 13 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Consultar Assiduidade</span>
                      <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1 }}>Selecione o ano e o mês</div>
                    </div>
                  </div>

                  <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }} className="sm:flex-row">
                      <select
                        style={{ ...selectStyle, maxWidth: 160 }}
                        onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                        value={selectedYear}
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                      </select>

                      <select
                        style={selectStyle}
                        onChange={(e) => handleSelectMonth(parseInt(e.target.value, 10))}
                        value={selectedMonth || ""}
                      >
                        <option value="" disabled>-- Selecione um Mês --</option>
                        {[
                          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                        ].map((month, index) => (
                          <option key={index} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>

                    {selectedMonth ? (
                      <div style={{ marginTop: 16, borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                        <TableHours username={userName} month={selectedMonth} year={selectedYear} onTotaisChange={handleTotaisChange} onDadosChange={handleDadosChange} />
                      </div>
                    ) : (
                      <div style={{ flex: 1, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                        Selecione um mês para consultar os registos de assiduidade.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[320px] flex-shrink-0">
                <UserStats
                  totaisAnuais={totaisAnuais}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  totais={totais}
                  feriasPendentes={feriasPendentes}
                  userName={userDetails?.nome}
                  dados={dados}
                  handleApproveVacation={handleApproveVacation}
                  handleRejectVacation={handleRejectVacation}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
