import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/Sidebar";
import Topbar from "../../../shared/components/Topbar";
import VacationTimeline from "../components/VacationTimeline";

export default function MapaFerias() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />
      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🏖️" title="Mapa de Férias" />
        <VacationTimeline year={year} onYearChange={setYear} />
      </div>
    </div>
  );
}
