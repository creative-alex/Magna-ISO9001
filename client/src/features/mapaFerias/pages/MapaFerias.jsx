import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import VacationTimeline from "../components/MapaFerias/VacationTimeline";

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
      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="🏖️" title="Mapa de Férias" />
        <VacationTimeline year={year} onYearChange={setYear} />
      </div>
    </div>
  );
}
