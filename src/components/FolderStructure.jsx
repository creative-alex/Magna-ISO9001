import React, { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa6";
import FilePreviewButton from "./Buttons/pdfPreviewButton";
import DeleteButton from "./Buttons/delete";
import CreateTableButton from "./Buttons/createTableButton";

export default function FolderStructure({ nodes, onSelectFile, currentPath = [], processOwners, currentUser, isAdmin, onDelete, onToggleFavorite, isFavorite }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const sortNodes = (nodes) => {
    const extractNumber = (name) => {
      let m = name.match(/^(\d+)/); if (m) return m[1];
      m = name.match(/procedimento\s+(\d+)/i); if (m) return m[1];
      m = name.match(/(\d+)/); if (m) return m[1];
      return 'other';
    };
    const groups = new Map();
    nodes.filter(n => n.type === "file").forEach(f => {
      const n = extractNumber(f.name);
      if (!groups.has(n)) groups.set(n, { files: [], folders: [] });
      groups.get(n).files.push(f);
    });
    nodes.filter(n => n.type === "folder").forEach(f => {
      const n = extractNumber(f.name);
      if (!groups.has(n)) groups.set(n, { files: [], folders: [] });
      groups.get(n).folders.push(f);
    });
    const sorted = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'other') return 1; if (b[0] === 'other') return -1;
      return parseInt(a[0]) - parseInt(b[0]);
    });
    const result = [];
    sorted.forEach(([, g]) => {
      g.files.sort((a, b) => a.name.localeCompare(b.name)); result.push(...g.files);
      g.folders.sort((a, b) => a.name.localeCompare(b.name)); result.push(...g.folders);
    });
    return result;
  };

  return (
    <div className="w-full">
      {sortNodes(nodes).map(node => {
        if (node.type === "folder") {
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          const isOwnerFolder = isTopLevel && folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser);
          return (
            <div
              key={node.name}
              className={`mb-2.5 rounded-lg overflow-hidden animate-fadeInUp ${isOwnerFolder ? 'border-[1.5px] border-[#C8932F] bg-[#fffdf7]' : 'border border-gray-200 bg-white'}`}
            >
              <div
                className={`folder-header flex items-center px-5 py-[14px] bg-gray-50 cursor-pointer transition-colors duration-200 font-semibold text-[14px] relative hover:bg-gray-100 ${expandedFolder === node.name ? 'active bg-[#C8932F] text-white' : ''}`}
                onClick={() => setExpandedFolder(expandedFolder === node.name ? null : node.name)}
              >
                <span className="text-[13px] font-semibold flex items-center gap-2 text-gray-700 flex-1">{node.name}</span>
                <div className="flex items-center gap-2.5">
                  {currentPath.length === 0 && (isAdmin || (folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser))) &&
                    <CreateTableButton folderName={node.name} currentPath={currentPath} />}
                  {isAdmin &&
                    <DeleteButton file={node} currentPath={currentPath} onDelete={onDelete} isFolder={true} />}
                </div>
              </div>
              {expandedFolder === node.name && (
                <div className="py-2.5 bg-[#fafbfc]">
                  <div className={currentPath.length > 0 ? 'ml-[18px] border-l-2 border-l-gray-100' : ''}>
                    <FolderStructure nodes={node.children || []} onSelectFile={onSelectFile} currentPath={[...currentPath, node.name]} processOwners={processOwners} currentUser={currentUser} isAdmin={isAdmin} onDelete={onDelete} onToggleFavorite={onToggleFavorite} isFavorite={isFavorite} />
                  </div>
                </div>
              )}
            </div>
          );
        }
        const filePath = [...currentPath, node.name].join("/");
        const isClickableFile = currentPath.length <= 1;
        const displayName = node.name.endsWith('.pdf') ? node.name.slice(0, -4) : node.name;
        const isFav = isFavorite && isFavorite(filePath);
        const processName = currentPath.length > 0 ? currentPath[0] : null;
        const processOwnerStr = processName ? processOwners[processName] : null;
        const canDeleteFile = isAdmin || (processOwnerStr && processOwnerStr.split(',').map(n => n.trim()).includes(currentUser));
        return (
          <div
            key={node.name}
            className={`flex justify-between items-center px-5 py-[13px] border border-gray-200 rounded-md mx-[14px] my-1.5 transition-all duration-200 animate-fadeInUp ${isClickableFile ? 'cursor-pointer bg-white hover:bg-[#fffbf0] hover:border-[#C8932F] hover:-translate-y-px' : 'cursor-default opacity-70 bg-white'}`}
            onClick={isClickableFile ? () => onSelectFile(filePath) : undefined}
          >
            <span className={`text-[13px] font-medium flex-grow mr-3 break-words flex items-center gap-2 ${isClickableFile ? 'text-[#92400e]' : 'text-gray-700'}`}>{displayName}</span>
            <div className="flex gap-1.5 shrink-0 items-center">
              {isClickableFile && onToggleFavorite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(filePath, displayName); }}
                  className="bg-[#fffbf0] text-[#C8932F] border border-yellow-200 px-2.5 py-1.5 rounded cursor-pointer text-base min-w-[34px] h-8 flex items-center justify-center transition-colors duration-150 hover:bg-yellow-50"
                  title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  {isFav ? <FaStar style={{ color: "#C8932F" }} /> : <FaRegStar style={{ color: "#C8932F" }} />}
                </button>
              )}
              <FilePreviewButton file={node} currentPath={currentPath} />
              {canDeleteFile && <DeleteButton file={node} currentPath={currentPath} onDelete={onDelete} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
