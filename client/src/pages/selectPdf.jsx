import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import userAddIcon from "../user_add.ico";
import fileAddIcon from "../file_add.ico";
import downloadIcon from "../download.ico";
import "../index.css";

// Função recursiva para filtrar nodes por nome
function filterTree(nodes, searchTerm) {
  if (!searchTerm) return nodes;
  return nodes
    .map(node => {
      if (node.type === "folder") {
        const filteredChildren = filterTree(node.children || [], searchTerm);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return node;
      }
      return null;
    })
    .filter(Boolean);
}

function FolderStructure({ nodes, onSelectFile, currentPath = [], processOwners, currentUser, isAdmin }) {
  const [expandedFolder, setExpandedFolder] = useState(null);

  const folders = nodes.filter(n => n.type === "folder");
  const files = nodes.filter(n => n.type === "file");

  const toggleFolder = (folderName) => {
    setExpandedFolder(expandedFolder === folderName ? null : folderName);
  };

  // Função para verificar se o utilizador pode aceder a um processo
  const canAccessProcess = (filePath) => {
    if (isAdmin) return true; // SuperAdmin pode aceder a tudo
    
    // Extrai o nome do processo (primeira pasta do caminho)
    const processName = filePath.split('/')[0];
    const processOwner = processOwners[processName];
    
    // Se não há dono definido, permite acesso (para compatibilidade)
    if (!processOwner) return true;
    
    // Verifica se o utilizador atual é o dono
    return processOwner === currentUser;
  };

  return (
    <div className="folder-structure">
      {folders.map(folder => {
        // Para pastas de primeiro nível, mostra o dono se existir
        const isTopLevel = currentPath.length === 0;
        const folderOwner = isTopLevel ? processOwners[folder.name] : null;
        
        return (
          <div key={folder.name} className="folder">
            <div
              className={`folder-header ${expandedFolder === folder.name ? 'active' : ''}`}
              onClick={() => toggleFolder(folder.name)}
            >
              <span className="folder-name">
                {folder.name}
              </span>
            </div>
          {expandedFolder === folder.name && (
            <div className="folder-content">
              <FolderStructure
                nodes={folder.children || []}
                onSelectFile={onSelectFile}
                currentPath={[...currentPath, folder.name]}
                processOwners={processOwners}
                currentUser={currentUser}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
        );
      })}

      {files.map(file => {
        const filePath = [...currentPath, file.name].join("/");
        const hasAccess = canAccessProcess(filePath);
        
        return (
          <div 
            key={file.name} 
            className={`file ${hasAccess ? 'file-clickable' : ''}`}
            onClick={hasAccess ? () => onSelectFile(filePath) : undefined}
            style={{ cursor: hasAccess ? 'pointer' : 'default' }}
          >
            <span className="file-name">{file.name}</span>
            <div className="file-actions">
              <button
                onClick={async (e) => {
                  e.stopPropagation(); // Evita trigger do onClick do div pai
                  try {
                      const filePath = [...currentPath, file.name].join("/");
                      
                      // 1. Primeiro, carrega os dados do PDF
                      const formDataResponse = await fetch("http://localhost:8080/files/pdf-form-data", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ filename: filePath }),
                      });
                      
                      if (!formDataResponse.ok) {
                        throw new Error("Erro ao carregar dados do PDF");
                      }
                      
                      const formData = await formDataResponse.json();
                      
                      // Determina o tipo de template baseado no nome do arquivo
                      const fileName = file.name;
                      const isTemplate2 = /^\d/.test(fileName) && !/^\d{2}/.test(fileName); // Arquivos que começam com 1 dígito são Template 2
                      
                      // 2. Processa os dados para o formato das tabelas
                      const { generateNonEditablePdf, generateNonEditablePdfTemplate2 } = await import("../utils/pdfGenerate");
                      
                      if (isTemplate2) {
                        // Template 2 - Processar dados específicos do template 2
                        
                        // Extrai dados específicos do Template 2
                        let donoProcesso = formData['dono_processo'] || '';
                        let objetivoProcesso = formData['objetivo_processo'] || '';
                        let servicosEntrada = formData['servicos_entrada'] || '';
                        let servicoSaida = formData['servico_saida'] || '';
                        
                        // Processa atividades (atividades_r*_c*)
                        const atividadesRows = {};
                        const indicadoresData = [];
                        
                        Object.keys(formData).forEach(key => {
                          if (key.startsWith('atividades_r')) {
                            const match = key.match(/atividades_r(\d+)_c(\d+)/);
                            if (match) {
                              const row = parseInt(match[1]) - 1; // -1 porque começa em r1
                              const col = parseInt(match[2]) - 1; // -1 porque começa em c1
                              if (!atividadesRows[row]) atividadesRows[row] = [];
                              atividadesRows[row][col] = formData[key] || '';
                            }
                          } else if (key.startsWith('indicadores_r')) {
                            const match = key.match(/indicadores_r(\d+)/);
                            if (match) {
                              const index = parseInt(match[1]) - 1; // -1 porque começa em r1
                              indicadoresData[index] = formData[key] || '';
                            }
                          }
                        });
                        
                        // Converte atividades em array ordenado
                        const atividades = [];
                        for (let i = 0; i < 10; i++) { // Máximo de 10 linhas
                          if (atividadesRows[i]) {
                            // Garante que cada linha tenha exatamente 6 colunas (Template 2)
                            const row = atividadesRows[i];
                            while (row.length < 6) {
                              row.push('');
                            }
                            atividades.push(row);
                          }
                        }
                        
                        // Garante que há pelo menos uma linha
                        if (atividades.length === 0) {
                          atividades.push(['', '', '', '', '', '']);
                        }
                        
                        // Garante que há pelo menos um indicador
                        if (indicadoresData.length === 0) {
                          indicadoresData.push('');
                        }
                        
                        
                        // 3. Gera o PDF não editável do Template 2
                        const nonEditablePdfBytes = await generateNonEditablePdfTemplate2(
                          atividades, 
                          donoProcesso, 
                          objetivoProcesso, 
                          indicadoresData, 
                          servicosEntrada, 
                          servicoSaida
                        );
                        
                        // 4. Abre o preview
                        const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, "_blank");
                        
                      } else {
                        // Template 1 - Processamento existente
                        // Converte os dados do formulário em formato de tabela
                        // Tabela principal (table2_*)
                        const mainTableData = [];
                        const obsTableData = [];
                        
                        // Extrai dados da tabela principal
                        const mainRows = {};
                        const obsRows = {};
                        
                        Object.keys(formData).forEach(key => {
                          if (key.startsWith('table2_r')) {
                            const match = key.match(/table2_r(\d+)_c(\d+)/);
                            if (match) {
                              const row = parseInt(match[1]) - 2; // -2 porque começa em r2
                              const col = parseInt(match[2]) - 1; // -1 porque começa em c1
                              if (!mainRows[row]) mainRows[row] = [];
                              mainRows[row][col] = formData[key] || '';
                            }
                          } else if (key.startsWith('table1_r')) {
                            const match = key.match(/table1_r(\d+)/);
                            if (match) {
                              const row = parseInt(match[1]) - 1; // -1 porque começa em r1
                              obsRows[row] = [formData[key] || ''];
                            }
                          }
                        });
                        
                        // Converte objetos em arrays ordenados
                        for (let i = 0; i < 20; i++) { // Máximo de 20 linhas
                          if (mainRows[i]) {
                            // Garante que cada linha tenha exatamente 5 colunas
                            const row = mainRows[i];
                            while (row.length < 5) {
                              row.push('');
                            }
                            mainTableData.push(row);
                          }
                        }
                        
                        for (let i = 0; i < 10; i++) { // Máximo de 10 linhas para observações
                          if (obsRows[i]) {
                            obsTableData.push(obsRows[i]);
                          }
                        }
                        
                        // Garante que há pelo menos uma linha de dados para evitar NaN
                        if (mainTableData.length === 0) {
                          mainTableData.push(['', '', '', '', '']);
                        }
                        
                        if (obsTableData.length === 0) {
                          obsTableData.push(['']);
                        }
                        
                        
                        // Headers do Template 1
                        const headers = [
                          'Fluxo\ndas Ações',
                          'Descrição',
                          'Responsável',
                          'Documentos\nAssociados',
                          'Instruções\nde Trabalho'
                        ];
                        
                        // 3. Gera o PDF não editável do Template 1
                        const nonEditablePdfBytes = await generateNonEditablePdf(mainTableData, headers, obsTableData);
                        
                        // 4. Abre o preview
                        const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, "_blank");
                      }
                      
                    } catch (error) {
                      console.error("Erro ao gerar preview:", error);
                      alert("Erro ao gerar preview do PDF. Tente novamente.");
                    }
                  }}
                ><img src={downloadIcon} alt="Baixar PDF" style={{ width: '16px', height: '16px' }} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SelecionarPdf() {
  const [pdfTree, setPdfTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // Novo estado para busca
  const [processOwners, setProcessOwners] = useState({}); // Donos dos processos
  const navigate = useNavigate();
  const { username } = useContext(UserContext);

  // Verifica se é SuperAdmin
  const isAdmin = username === "superadmin" || username === "SuperAdmin";

  useEffect(() => {
    // Busca a árvore de PDFs
    fetch("http://localhost:8080/files/list-pdfs-tree")
      .then(res => res.json())
      .then(setPdfTree)
      .catch(() => setPdfTree([]));

    // Busca os donos dos processos
    fetch("http://localhost:8080/files/process-owners")
      .then(res => res.json())
      .then(setProcessOwners)
      .catch(() => setProcessOwners({}));
  }, []);

  const handleSelectFile = (filePath) => {
    // Substitui espaços por '-', barras por '__'
    const formattedPath = filePath.replace(/\s/g, '-').replace(/\//g, '__');
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  // Filtra a árvore conforme o termo de busca
  const filteredTree = filterTree(pdfTree, searchTerm);

  return (
    <div className="pdf-container">
      <h2 className="title">SISTEMA ISO 9001</h2>
      <input
        type="text"
        placeholder="Encontrar arquivo ou pasta..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <div className="pdf-panel">
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="panel-title">Índice</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="createUser-button" onClick={() => navigate('/create-user')}>
              <img src={userAddIcon} alt="Adicionar Utilizador" style={{ width: '16px', height: '16px', marginRight: '5px' }} />
            </button>
            <button className="createUser-button" onClick={() => navigate('/create-process')}>
              <img src={fileAddIcon} alt="Adicionar Processo" style={{ width: '16px', height: '16px', marginRight: '5px' }} />
            </button>
          </div>
        )}
      </div>
        <FolderStructure 
          nodes={filteredTree} 
          onSelectFile={handleSelectFile} 
          processOwners={processOwners}
          currentUser={username}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};
