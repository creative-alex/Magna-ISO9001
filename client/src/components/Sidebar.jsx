import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/userContext";
import { FavoritesContext } from "../context/favoritesContext";
import {
  FaChartBar,
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
} from "react-icons/fa6";

const PEOPLE_MANAGEMENT_ITEMS = [
  { name: "Cadastro", icon: FaIdCard },
  { name: "Plano de Formação", icon: FaGraduationCap },
  { name: "Mapa de Férias", icon: FaUmbrellaBeach },
  { name: "Livro de Ponto", icon: FaClock },
  { name: "Processamento Salários", icon: FaSackDollar },
  { name: "Medicina de Trabalho", icon: FaBriefcaseMedical },
  { name: "Prémios", icon: FaTrophy },
];

export default function Sidebar({ onSelectFile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, nivelAcesso } = useContext(UserContext);
  const { favorites, toggleFavorite } = useContext(FavoritesContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const isActive = (path) => location.pathname === path;

  const handlePeopleManagementItemClick = (item) => {
    if (item.name === "Livro de Ponto") {
      navigate("/ponto");
    } else if (item.name === "Cadastro") {
      navigate(isAdmin || isHR ? "/colaboradores" : "/cadastro");
    } else if (item.name === "Processamento Salários" && (isAdmin || isHR)) {
      navigate("/salarios");
    } else if (item.name === "Mapa de Férias") {
      navigate("/ferias");
    } else {
      toast.info("Funcionalidade em breve", { position: "top-right", autoClose: 2500 });
    }
    setShowResourcesDropdown(false);
  };

  const navItemClass = (path) =>
    `flex items-center gap-2.5 py-[9px] px-3 text-[13px] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 relative no-underline ${
      isActive(path)
        ? 'bg-[#EDD9A3] text-[#7A5010] font-semibold'
        : 'text-[#5C3D0E] hover:bg-[#F0E2C4]'
    }`;

  const navItemBaseClass =
    'flex items-center gap-2.5 py-[9px] px-3 text-[13px] text-[#5C3D0E] cursor-pointer rounded-md mx-2 my-px transition-colors duration-150 relative no-underline hover:bg-[#F0E2C4]';

  return (
    <>
      <aside className="w-[230px] bg-[#FAF3E6] border-r border-[#E8D0A0] flex flex-col fixed top-0 left-0 h-screen z-[100] shrink-0">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-[#E8D0A0] flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-[#C8932F] flex items-center justify-center text-[15px] font-semibold text-white shrink-0">C</div>
          <div>
            <div className="text-[13px] font-semibold text-[#4A2E08] leading-[1.3]">Magna ISO9001</div>
            <div className="text-[10px] text-[#B8892A] mt-px">Cooperativa Comenius</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        {/* Principal */}
        <div className="px-[14px] pt-4 pb-[5px] text-[10px] text-[#B8892A] tracking-[0.08em] uppercase font-semibold">Principal</div>
        <div className={navItemClass("/dashboard")} onClick={() => navigate("/dashboard")}>
          <FaChartBar style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> ISO 9001 </div>
        {/* Gestão de Pessoas accordion */}
        <div className={navItemBaseClass} onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}>
          <FaPeopleGroup style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Gestão de Pessoas
          <span className={`text-[10px] transition-transform duration-[250ms] ml-auto${showResourcesDropdown ? ' rotate-180' : ''}`}>▼</span>
        </div>
        {showResourcesDropdown && (
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
        )}

        {/* Favoritos accordion */}
        {favorites.length > 0 && (
          <>
            <div className={navItemBaseClass} onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}>
              <FaStar style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Favoritos ({favorites.length})
              <span className={`text-[10px] transition-transform duration-[250ms] ml-auto${showFavoritesDropdown ? ' rotate-180' : ''}`}>▼</span>
            </div>
            {showFavoritesDropdown && (
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
            )}
          </>
        )}

        {/* Ações rápidas */}
        <div className="px-[14px] pt-4 pb-[5px] text-[10px] text-[#B8892A] tracking-[0.08em] uppercase font-semibold">Ações rápidas</div>
        <div className={navItemBaseClass} onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSePnbZJUGv7J_YW0MKXn-E61t_naMr25TO2nk_GRDdR8Z13MQ/viewform', '_blank')}>
          <FaTriangleExclamation style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Registar Não Conformidade
        </div>
        <div className={navItemBaseClass} onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScrMQcU-waZqVtapeChdN3cQOl8SRQtZkWZEUJNvAYvvYLIJw/viewform', '_blank')}>
          <FaArrowsRotate style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Tratar Não Conformidade
        </div>

        {/* Administração */}
        {isAdmin && (
          <>
            <div className="px-[14px] pt-4 pb-[5px] text-[10px] text-[#B8892A] tracking-[0.08em] uppercase font-semibold">Administração</div>
            <div className={navItemBaseClass} onClick={() => navigate('/create-user')}>
              <FaUser style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Novo Utilizador
            </div>
            <div className={navItemBaseClass} onClick={() => navigate('/novo-processo')}>
              <FaClipboardList style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Novo Processo
            </div>
            <div className={navItemBaseClass} onClick={() => navigate('/ponto/entidades')}>
              <FaClock style={{ fontSize: 16, color: "var(--gold)", flexShrink: 0 }} /> Gerir Livro de Ponto
            </div>
          </>
        )}

        </div>{/* end scrollable area */}

        {/* User pill / bottom */}
        <div className="px-2 py-3 border-t border-[#E8D0A0] shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors duration-150 hover:bg-[#F0E2C4]"
            onClick={() => navigate('/perfil')}
          >
            <div className="w-[30px] h-[30px] rounded-full bg-[#C8932F] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
              {initials}
            </div>
            <div>
              <div className="text-xs text-[#4A2E08] font-semibold">{username}</div>
              <div className="text-[10px] text-[#B8892A]">{isAdmin ? 'SuperAdmin' : 'Utilizador'}</div>
            </div>
            <FaUser style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--section-label)' }} />
          </div>
        </div>
      </aside>
    </>
  );
}
