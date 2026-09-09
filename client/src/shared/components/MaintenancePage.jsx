import React from "react";
import { FaGear } from "react-icons/fa6";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const GOLD = "#C8932F";
const GOLD_DARK = "#5C3E1E";
const GOLD_LIGHT = "#EFCB8B";

export default function MaintenancePage({ title = "Em manutenção", icon = "🚧" }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon={icon} title={title} />

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-72 h-64 mb-6 select-none">
            <div style={{ position: "absolute", top: "22%", left: "48%", transform: "translate(-50%, -50%)" }}>
              <FaGear
                className="drop-shadow-md"
                style={{ fontSize: "8rem", color: GOLD, animation: "gear-spin-cw 6s linear infinite", display: "block" }}
              />
            </div>
            <div style={{ position: "absolute", top: "67%", left: "30%", transform: "translate(-50%, -50%)" }}>
              <FaGear
                className="drop-shadow-md"
                style={{ fontSize: "6.5rem", color: GOLD_DARK, animation: "gear-spin-ccw 5s linear infinite", display: "block" }}
              />
            </div>
            <div style={{ position: "absolute", top: "60%", left: "59%", transform: "translate(-50%, -50%)" }}>
              <FaGear
                className="drop-shadow-md"
                style={{ fontSize: "4rem", color: GOLD_LIGHT, animation: "gear-spin-ccw 3s linear infinite", display: "block" }}
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Página em manutenção
          </h1>
          <p className="text-base text-gray-700 max-w-md leading-relaxed">
            <span className="font-semibold" style={{ color: GOLD }}>
              Calma, calma... que isto não é um erro...
            </span>
            <br />
            é só o sistema a receber uns retoques.
          </p>
          <p className="text-base text-gray-700 mt-3">
            Volta a passar por aqui daqui a pouco!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gear-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gear-spin-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
