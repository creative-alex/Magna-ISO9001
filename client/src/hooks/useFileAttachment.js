import { useState, useCallback } from 'react';

/**
 * Hook personalizado para gerenciar anexos de arquivos
 * Reutilizável em múltiplas páginas
 */
const useFileAttachment = () => {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState('');

  /**
   * Busca documentos disponíveis baseado no arquivo original
   * @param {string} originalFilename - Nome do arquivo original para determinar a pasta
   */
  const fetchAvailableFiles = useCallback(async (originalFilename) => {
    if (!originalFilename) return [];

    console.log('🔍 Procurando documentos para:', originalFilename);
    
    const parts = originalFilename.split('/');
    if (parts.length < 2) {
      console.log('❌ Caminho inválido, deve ter pelo menos pasta/ficheiro');
      return [];
    }
    
    const mainFolder = parts[0];
    const currentFileName = parts[parts.length - 1];
    const filePrefix = currentFileName.split(' ')[0];
    
    console.log('📁 Pasta principal:', mainFolder);
    console.log('🏷️ Prefixo do ficheiro:', filePrefix);

    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.219:8080/files/list-files-tree');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar árvore de ficheiros');
      }
      
      const fileTree = await response.json();
      
      // Encontra a pasta principal na árvore
      const mainFolderNode = fileTree.find(node => 
        node.type === 'folder' && node.name === mainFolder
      );
      
      if (!mainFolderNode || !mainFolderNode.children) {
        console.log('❌ Pasta principal não encontrada ou vazia');
        setAvailableFiles([]);
        setCurrentFolderPath(mainFolder);
        return [];
      }
      
      // Encontra a subpasta que segue o padrão "Informação Documentada - Procedimento (prefixo)"
      const expectedSubfolderName = `Informação Documentada - Procedimento ${filePrefix}`;
      const targetSubfolder = mainFolderNode.children.find(node => 
        node.type === 'folder' && node.name === expectedSubfolderName
      );
      
      if (!targetSubfolder || !targetSubfolder.children) {
        console.log(`❌ Subpasta "${expectedSubfolderName}" não encontrada ou vazia`);
        setAvailableFiles([]);
        setCurrentFolderPath(`${mainFolder}/${expectedSubfolderName}`);
        return [];
      }
      
      console.log(`📂 Subpasta encontrada: ${targetSubfolder.name}`);
      
      // Função recursiva para extrair todos os ficheiros da subpasta específica
      const extractAllFiles = (nodes, currentPath = '') => {
        let allFiles = [];
        
        for (const node of nodes) {
          const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          
          if (node.type === 'file') {
            allFiles.push({
              name: node.name,
              path: fullPath,
              folder: currentPath || targetSubfolder.name
            });
          } else if (node.type === 'folder' && node.children) {
            const subFiles = extractAllFiles(node.children, fullPath);
            allFiles = allFiles.concat(subFiles);
          }
        }
        
        return allFiles;
      };
      
      // Extrai todos os ficheiros da subpasta específica
      const allFiles = extractAllFiles(targetSubfolder.children);
      
      // Formata os documentos para display
      const documentos = allFiles.map(file => ({
        displayName: file.name,
        fullPath: `${mainFolder}/${targetSubfolder.name}/${file.path}`,
        folder: file.folder
      }));
      
      setAvailableFiles(documentos);
      setCurrentFolderPath(`${mainFolder}/${targetSubfolder.name}`);
      
      return documentos;
      
    } catch (error) {
      console.error('🚨 Erro na busca de documentos:', error);
      setAvailableFiles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Faz upload de um novo arquivo
   * @param {File} file - Arquivo a ser enviado
   * @param {string} originalFilename - Nome do arquivo original para determinar destino
   */
  const uploadFile = useCallback(async (file, originalFilename) => {
    if (!file || !originalFilename) {
      throw new Error('Arquivo e nome do ficheiro original são obrigatórios');
    }

    const parts = originalFilename.split('/');
    const mainFolder = parts[0];
    const currentFileName = parts[parts.length - 1];
    const filePrefix = currentFileName.split(' ')[0];
    
    const subfolderName = `Informação Documentada - Procedimento ${filePrefix}`;
    const folderPath = `${mainFolder}/${subfolderName}`;

    setUploading(true);
    
    try {
      console.log('Fazendo upload para:', folderPath);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath + '/');

      const response = await fetch('http://192.168.1.219:8080/files/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Upload realizado com sucesso');
        // Recarrega a lista de documentos
        await fetchAvailableFiles(originalFilename);
        
        // Adiciona automaticamente o documento aos anexados
        toggleAttachment(file.name);
        
        return { success: true, message: 'Documento enviado com sucesso!' };
      } else {
        console.error('Erro no upload:', response.statusText);
        throw new Error('Erro ao enviar documento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [fetchAvailableFiles]);

  /**
   * Alterna a seleção de um arquivo anexado
   * @param {string} fileName - Nome do arquivo para alternar
   */
  const toggleAttachment = useCallback((fileName) => {
    setAttachedFiles(prev => {
      const isAttached = prev.includes(fileName);
      if (isAttached) {
        return prev.filter(file => file !== fileName);
      } else {
        return [...prev, fileName];
      }
    });
  }, []);

  /**
   * Define arquivos anexados a partir de uma string (para compatibilidade)
   * @param {string} attachmentsString - String com anexos separados por vírgula ou quebra de linha
   */
  const setAttachmentsFromString = useCallback((attachmentsString) => {
    if (!attachmentsString) {
      setAttachedFiles([]);
      return;
    }
    
    const files = attachmentsString
      .split(/[,\n]/)
      .map(file => file.trim())
      .filter(file => file.length > 0);
    
    setAttachedFiles(files);
  }, []);

  /**
   * Obtém arquivos anexados como string (para compatibilidade)
   * @returns {string} String com anexos separados por quebra de linha
   */
  const getAttachmentsAsString = useCallback(() => {
    return attachedFiles.join('\n');
  }, [attachedFiles]);

  /**
   * Faz preview de um documento
   * @param {string} fileName - Nome do arquivo
   */
  const previewFile = useCallback(async (fileName) => {
    const docObject = availableFiles.find(doc => 
      doc.displayName === fileName || doc.name === fileName
    );
    
    if (!docObject) {
      throw new Error('Documento não encontrado.');
    }
    
    const fullPath = docObject.fullPath;
    console.log('👁️ Preview:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/get-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: encodeURIComponent(fullPath) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          throw new Error('Pop-ups bloqueados. Por favor, permita pop-ups para visualizar o documento.');
        } else {
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
        
        return { success: true };
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao carregar o documento para preview: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no preview:', error);
      throw error;
    }
  }, [availableFiles]);

  /**
   * Faz download de um documento
   * @param {string} fileName - Nome do arquivo
   */
  const downloadFile = useCallback(async (fileName) => {
    const docObject = availableFiles.find(doc => 
      doc.displayName === fileName || doc.name === fileName
    );
    
    if (!docObject) {
      throw new Error('Documento não encontrado.');
    }
    
    const fullPath = docObject.fullPath;
    console.log('⬇️ Download:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: encodeURIComponent(fullPath) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = docObject.displayName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return { success: true };
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao fazer download: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no download:', error);
      throw error;
    }
  }, [availableFiles]);

  /**
   * Limpa todos os anexos
   */
  const clearAttachments = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  return {
    // Estados
    attachedFiles,
    availableFiles,
    loading,
    uploading,
    currentFolderPath,
    
    // Funções
    fetchAvailableFiles,
    uploadFile,
    toggleAttachment,
    setAttachmentsFromString,
    getAttachmentsAsString,
    previewFile,
    downloadFile,
    clearAttachments
  };
};

export default useFileAttachment;