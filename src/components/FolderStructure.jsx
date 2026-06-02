import React, { useState } from "react";
import FilePreviewButton from "./Buttons/pdfPreviewButton";
import DeleteButton from "./Buttons/delete";
import CreateTableButton from "./Buttons/createTableButton";
import { fixEncoding } from "../utils/fixEncoding";

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
    <div className="folder-structure">
      {sortNodes(nodes).map(node => {
        if (node.type === "folder") {
          const isTopLevel = currentPath.length === 0;
          const folderOwner = isTopLevel ? processOwners[node.name] : null;
          const isOwnerFolder = isTopLevel && folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser);
          return (
            <div key={node.name} className={`folder ${isOwnerFolder ? 'owner-folder' : ''}`}>
              <div className={`folder-header ${expandedFolder === node.name ? 'active' : ''}`} onClick={() => setExpandedFolder(expandedFolder === node.name ? null : node.name)}>
                <span className="folder-name">{fixEncoding(node.name)}</span>
                <div className="folder-actions">
                  {currentPath.length === 0 && (isAdmin || (folderOwner && folderOwner.split(',').map(n => n.trim()).includes(currentUser))) &&
                    <CreateTableButton folderName={node.name} currentPath={currentPath} />}
                </div>
              </div>
              {expandedFolder === node.name && (
                <div className="folder-content">
                  <FolderStructure nodes={node.children || []} onSelectFile={onSelectFile} currentPath={[...currentPath, node.name]} processOwners={processOwners} currentUser={currentUser} isAdmin={isAdmin} onDelete={onDelete} onToggleFavorite={onToggleFavorite} isFavorite={isFavorite} />
                </div>
              )}
            </div>
          );
        }
        const filePath = [...currentPath, node.name].join("/");
        const isClickableFile = currentPath.length <= 1;
        const displayName = fixEncoding(node.name.endsWith('.pdf') ? node.name.slice(0, -4) : node.name);
        const isFav = isFavorite && isFavorite(filePath);
        return (
          <div key={node.name} className={`file ${isClickableFile ? 'file-clickable' : ''}`} style={{ cursor: isClickableFile ? 'pointer' : 'default' }} onClick={isClickableFile ? () => onSelectFile(filePath) : undefined}>
            <span className="file-name">{displayName}</span>
            <div className="file-actions">
              {isClickableFile && onToggleFavorite && (
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(filePath, displayName); }} className="favorite-button" title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>{isFav ? '⭐' : '☆'}</button>
              )}
              <FilePreviewButton file={node} currentPath={currentPath} />
              {isAdmin && <DeleteButton file={node} currentPath={currentPath} onDelete={onDelete} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
