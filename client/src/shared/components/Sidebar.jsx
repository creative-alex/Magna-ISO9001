import React, { useState, useContext, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/userContext";
import { FavoritesContext } from "../context/favoritesContext";
import Logo from "../assets/logo.svg";
import {
  FaChartBar,
  FaBuilding,
  FaPeopleGroup,
  FaStar,
  FaTriangleExclamation,
  FaArrowsRotate,
  FaUser,
  FaClipboardList,
  FaXmark,
  FaFile,
  FaIdCard,
  FaGraduationCap,
  FaUmbrellaBeach,
  FaClock,
  FaSackDollar,
  FaBriefcaseMedical,
  FaTrophy,
  FaComments,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa6";

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
const RESOURCES_DROPDOWN_KEY = "sidebarResourcesOpen";
const EXPANDED_WIDTH = 230;
const COLLAPSED_WIDTH = 64;
const MOBILE_BREAKPOINT = "(max-width: 767px)";

const PEOPLE_MANAGEMENT_ITEMS = [
  { name: "Cadastro", icon: FaIdCard },
  { name: "Plano de Formação", icon: FaGraduationCap },
  { name: "Mapa de Férias", icon: FaUmbrellaBeach },
  { name: "Livro de Ponto", icon: FaClock },
  { name: "Processamento Salários", icon: FaSackDollar },
  { name: "Medicina de Trabalho", icon: FaBriefcaseMedical },
  { name: "Prémios", icon: FaTrophy },
];

const PEOPLE_MANAGEMENT_PATH_PREFIXES = [
  "/ponto",
  "/colaboradores",
  "/cadastro",
  "/salarios",
  "/plano-formacao",
  "/ferias",
  "/medicina-trabalho",
  "/premios",
];

const isPeopleManagementPath = (pathname) =>
  PEOPLE_MANAGEMENT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

// Mesma normalização usada em toda a app para gerar o slug de uma entidade a
// partir do seu nome (ex: allEntities.jsx, Entity.jsx)  -  aqui só é preciso para
// levar um Administrador direto à página da sua própria entidade.
const normalizeEntitySlug = (nome) => (nome || "").toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/&/g, 'e')
  .replace(/-/g, ' ')
  .replace(/[^a-z0-9\s]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function Sidebar({ onSelectFile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, nivelAcesso, uid, entidadeNome, userRole } = useContext(UserContext);
  const { favorites, toggleFavorite } = useContext(FavoritesContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const isGestorFinanceiro = nivelAcesso === "GestorFinanceiro";
  const canManageColaboradores = isAdmin || isHR || isAdministrador;
  // Gestor Financeiro só entra na vista de lista em Processamento de Salários e
  // Prémios (as duas áreas que gere)  -  nunca em Cadastro/Plano de Formação/
  // Medicina de Trabalho, que continuam fora do seu âmbito.
  const canManageFinanceiro = canManageColaboradores || isGestorFinanceiro;
  // Prémios: GestorRH só consulta os seus próprios (ver canRead em premiosController) -
  // ao contrário das outras áreas de gestão de pessoas, nunca vê a lista de colaboradores aqui.
  const canManagePremios = isAdmin || isAdministrador || isGestorFinanceiro;
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";
  // Função do colaborador (campo "role", editado em Cadastro > Dados contratuais)  -
  // "user"/"User" é o valor por omissão de contas sem função preenchida (ver
  // verifyTokenAndGetUserInfo/createUser), por isso não é mostrado.
  const funcao = userRole && userRole.toLowerCase() !== "user" ? userRole : "";

  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(() =>
    isPeopleManagementPath(location.pathname) ||
    localStorage.getItem(RESOURCES_DROPDOWN_KEY) === "1"
  );
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1" ||
    window.matchMedia(MOBILE_BREAKPOINT).matches
  );
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia(MOBILE_BREAKPOINT).matches
  );
  const isActive = (path) => location.pathname === path;

  // Em mobile o sidebar expandido não pode empurrar o conteúdo (não há
  // largura sobrando) - passa a sobrepor-se como uma gaveta, por isso o
  // conteúdo reserva sempre só a largura colapsada.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      `${isMobile || collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`
    );
  }, [collapsed, isMobile]);

  // Em ecrãs estreitos o sidebar arranca sempre colapsado (mesmo que o
  // utilizador o tenha deixado expandido num ecrã maior), para não ocupar
  // uma fatia grande do espaço disponível.
  useLayoutEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    const handleChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setCollapsed(true);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const toggleResourcesDropdown = () => {
    setShowResourcesDropdown((prev) => {
      const next = !prev;
      localStorage.setItem(RESOURCES_DROPDOWN_KEY, next ? "1" : "0");
      return next;
    });
  };

  const handlePeopleManagementItemClick = (item) => {
    if (item.name === "Livro de Ponto") {
      navigate("/ponto");
    } else if (item.name === "Cadastro") {
      navigate(canManageColaboradores ? "/colaboradores" : "/cadastro");
    } else if (item.name === "Processamento Salários") {
      navigate(canManageFinanceiro ? "/salarios" : `/salarios/${uid}`);
    } else if (item.name === "Plano de Formação") {
      navigate(canManageColaboradores ? "/plano-formacao" : `/plano-formacao/${uid}`);
    } else if (item.name === "Medicina de Trabalho") {
      navigate(canManageColaboradores ? "/medicina-trabalho" : `/medicina-trabalho/${uid}`);
    } else if (item.name === "Prémios") {
      navigate(canManagePremios ? "/premios" : `/premios/${uid}`);
    } else if (item.name === "Mapa de Férias") {
      navigate("/ferias");
    } else {
      toast.info("Funcionalidade em breve", { position: "top-right", autoClose: 2500 });
    }
  };

  const navItemClass = (path) =>
    `flex items-center gap-2.5 py-[9px] ${collapsed ? 'justify-center px-0' : 'px-3'} text-[13px] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 relative no-underline ${
      isActive(path)
        ? 'bg-[#EDD9A3] text-[#7A5010] font-semibold'
        : 'text-[#5C3D0E] hover:bg-[#F0E2C4]'
    }`;

  const navItemBaseClass =
    `flex items-center gap-2.5 py-[9px] ${collapsed ? 'justify-center px-0' : 'px-3'} text-[13px] text-[#5C3D0E] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 relative no-underline hover:bg-[#F0E2C4]`;

  const sectionLabel = (text) =>
    collapsed ? (
      <div className="mx-3 mt-4 mb-[5px] border-t border-[#E8D0A0]" />
    ) : (
      <div className="px-[14px] pt-4 pb-[5px] text-[10px] text-[#B8892A] tracking-[0.08em] uppercase font-semibold">{text}</div>
    );

  return (
    <>
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-[490]"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside className={`${collapsed ? 'w-16' : 'w-[230px]'} bg-[#FAF3E6] border-r border-[#E8D0A0] flex flex-col fixed top-0 left-0 h-screen z-[500] shrink-0 transition-[width] duration-200 overflow-visible${isMobile && !collapsed ? ' shadow-2xl' : ''}`}>
        {/* Logo */}
        <div className={`px-4 pt-5 pb-4 border-b border-[#E8D0A0] flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <img src={Logo} alt="Logo Magna" className="w-auto h-[55px] shrink-0" />
          {!collapsed && (
            <div>
              <div className="text-[13px] font-semibold text-[#4A2E08] leading-[1.3]">Magna ISO9001</div>
              <div className="text-[10px] text-[#B8892A] mt-px">Cooperativa Comenius</div>
            </div>
          )}
        </div>

        {/* Toggle collapse button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Colapsar menu"}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full border border-[#E8D0A0] bg-white shadow flex items-center justify-center text-[#7A5010] hover:bg-[#F0E2C4] transition-colors duration-150 z-10"
        >
          {collapsed ? <FaChevronRight style={{ fontSize: 10 }} /> : <FaChevronLeft style={{ fontSize: 10 }} />}
        </button>

        <div className="flex-1 overflow-y-auto">
        {/* Principal */}
        {sectionLabel("Principal")}
        <div className={navItemClass("/dashboard")} onClick={() => navigate("/dashboard")} title={collapsed ? "ISO9001" : undefined}>
          <FaChartBar style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "ISO 9001"}</div>
        <div className={navItemClass("/chat")} onClick={() => navigate("/chat")} title={collapsed ? "Chat com RH" : undefined}>
          <FaComments style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Chat com RH"}</div>
        {/* Gestão de Pessoas accordion */}
        <div
          className={navItemBaseClass}
          onClick={toggleResourcesDropdown}
          title={collapsed ? "Gestão de Pessoas" : undefined}
        >
          <FaPeopleGroup style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} />
          {!collapsed && (
            <>
              Gestão de Pessoas
              <span className={`text-[10px] transition-transform duration-[250ms] ml-auto${showResourcesDropdown ? ' rotate-180' : ''}`}>▼</span>
            </>
          )}
        </div>
        {showResourcesDropdown && (
          collapsed ? (
            <div className="mb-1">
              {PEOPLE_MANAGEMENT_ITEMS.map(item => (
                <div
                  key={item.name}
                  className="flex items-center justify-center py-[9px] text-[13px] text-[#5C3D0E] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 hover:bg-[#F0E2C4]"
                  onClick={() => handlePeopleManagementItemClick(item)}
                  title={item.name}
                >
                  <item.icon style={{ fontSize: 14, color: "var(--gold)", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-2 mb-1 rounded-md overflow-hidden border border-[#E8D0A0] bg-[#FDF8EE]">
              {PEOPLE_MANAGEMENT_ITEMS.map(item => (
                <div
                  key={item.name}
                  className="flex items-start gap-2 px-3 py-[8px] border-b border-[#EDE0C4] last:border-b-0 cursor-pointer transition-colors duration-150 hover:bg-[#F0E2C4]"
                  onClick={() => handlePeopleManagementItemClick(item)}
                >
                  <item.icon style={{ fontSize: 12, color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
                  <span className="text-[12px] text-[#5C3D0E] font-medium leading-snug break-words min-w-0">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Favoritos accordion */}
        {favorites.length > 0 && (
          <>
            <div
              className={navItemBaseClass}
              onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
              title={collapsed ? `Favoritos (${favorites.length})` : undefined}
            >
              <FaStar style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} />
              {!collapsed && (
                <>
                  Favoritos ({favorites.length})
                  <span className={`text-[10px] transition-transform duration-[250ms] ml-auto${showFavoritesDropdown ? ' rotate-180' : ''}`}>▼</span>
                </>
              )}
            </div>
            {showFavoritesDropdown && (
              collapsed ? (
                <div className="mb-1">
                  {favorites.map(fav => (
                    <div
                      key={fav.path}
                      className="flex items-center justify-center py-[9px] text-[13px] text-[#5C3D0E] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 hover:bg-[#F0E2C4]"
                      onClick={() => onSelectFile(fav.path)}
                      title={fav.name}
                    >
                      <FaFile style={{ fontSize: 14, color: "var(--gold)", flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mx-2 mb-1 rounded-md overflow-hidden border border-[#E8D0A0] bg-[#FDF8EE]">
                  {favorites.map(fav => (
                    <div
                      key={fav.path}
                      className="flex items-start gap-2 px-3 py-[8px] border-b border-[#EDE0C4] last:border-b-0 transition-colors duration-150 hover:bg-[#F0E2C4]"
                    >
                      <FaFile style={{ fontSize: 12, color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
                      <span
                        className="flex-1 text-[12px] text-[#5C3D0E] font-medium cursor-pointer leading-snug break-words min-w-0 hover:text-[#C8932F] transition-colors duration-150"
                        onClick={() => { onSelectFile(fav.path); setShowFavoritesDropdown(false); }}
                      >
                        {fav.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(fav.path, fav.name); }}
                        className="bg-red-50 text-red-600 border border-red-200 rounded cursor-pointer text-base font-bold leading-[1] transition-colors duration-150 hover:bg-red-100 shrink-0 w-[22px] h-[22px] flex items-center justify-center"
                        title="Remover"
                      >
                        <FaXmark style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}

        {/* Ações rápidas */}
        {sectionLabel("Ações rápidas")}
        <div className={navItemBaseClass} onClick={() => navigate('/registar-nao-conformidade')} title={collapsed ? "Registar Não Conformidade" : undefined}>
          <FaTriangleExclamation style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Registar Não Conformidade"}
        </div>
        <div className={navItemBaseClass} onClick={() => navigate('/tratar-nao-conformidade')} title={collapsed ? "Tratar Não Conformidade" : undefined}>
          <FaArrowsRotate style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Tratar Não Conformidade"}
        </div>

        {/* Administração  -  SuperAdmin e GestorRH veem tudo (exceto "Novo Processo", que
            é sobre documentação ISO e não tem nada a ver com colaboradores, por isso
            continua exclusivo do SuperAdmin); Administrador só as ações que se aplicam
            à sua própria entidade. */}
        {(isAdmin || isHR || isAdministrador) && (
          <>
            {sectionLabel("Administração")}
            <div
              className={navItemBaseClass}
              onClick={() => navigate('/create-user')}
              title={collapsed ? "Novo Utilizador" : undefined}
            >
              <FaUser style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Novo Utilizador"}
            </div>
            {(isAdmin || isHR) && (
              <div
                className={navItemBaseClass}
                onClick={() => navigate('/ponto/nova-entidade')}
                title={collapsed ? "Nova Entidade" : undefined}
              >
                <FaBuilding style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Nova Entidade"}
              </div>
            )}
            {isAdmin && (
              <div className={navItemBaseClass} onClick={() => navigate('/novo-processo')} title={collapsed ? "Novo Processo" : undefined}>
                <FaClipboardList style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Novo Processo"}
              </div>
            )}
            <div
              className={navItemBaseClass}
              onClick={() => navigate((isAdmin || isHR) ? '/ponto/entidades' : `/ponto/entidades/${normalizeEntitySlug(entidadeNome)}`)}
              title={collapsed ? "Gerir Livro de Ponto" : undefined}
            >
              <FaClock style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> {!collapsed && "Gerir Livro de Ponto"}
            </div>
          </>
        )}

        </div>{/* end scrollable area */}

        {/* User pill / bottom */}
        <div className="px-2 py-3 border-t border-[#E8D0A0] shrink-0">
          <div
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? (funcao ? `${username} · ${funcao}` : username) : undefined}
          >
            <div className="w-[30px] h-[30px] rounded-full bg-[#C8932F] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div>
                <div className="text-xs text-[#4A2E08] font-semibold">{username}</div>
                {funcao && <div className="text-[10px] text-[#B8892A]">{funcao}</div>}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
