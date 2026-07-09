import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { FaArrowRightFromBracket } from "react-icons/fa6";

export default function Topbar({ icon, title, searchTerm, onSearchChange, adminButtons }) {
  const { username, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 h-[54px] flex items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-900 font-semibold">{title}</span>
        </div>
        {onSearchChange && (
          <div className="ml-auto relative flex items-center">
            <span className="absolute left-[10px] text-[14px] text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar arquivos..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="py-[7px] pr-3 pl-[34px] text-[13px] w-[220px] rounded-lg border border-gray-200 bg-gray-50 text-gray-900 transition-all focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)]"
            />
          </div>
        )}
        {adminButtons && <div className="flex gap-2">{adminButtons}</div>}
        <span className={`text-[13px] text-gray-500 whitespace-nowrap${!onSearchChange ? " ml-auto" : ""}`}>
          Olá, {username}
        </span>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-1.5 px-3 py-[6px] text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-red-100 shrink-0"
          title="Terminar sessão"
        >
          <FaArrowRightFromBracket style={{ fontSize: 13 }} />
          Sair
        </button>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[1000]">
          <div className="bg-white rounded-xl p-7 min-w-[300px] max-w-[380px] text-center">
            <div className="text-[44px] mb-[14px]">👋</div>
            <h3 className="m-0 mb-2 text-[17px] font-semibold text-gray-900">Confirmar saída</h3>
            <p className="m-0 mb-[22px] text-gray-500 text-[14px] leading-[1.5]">Tem a certeza que pretende terminar a sessão?</p>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-[9px] bg-gray-100 text-gray-700 border-0 rounded-lg cursor-pointer text-[14px] font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { setShowLogoutModal(false); await logout(); navigate("/", { replace: true }); }}
                className="px-5 py-[9px] bg-red-600 text-white border-0 rounded-lg cursor-pointer text-[14px] font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
