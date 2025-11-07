import React, { useState, useEffect, useRef } from 'react';
import { useTutorial, TUTORIAL_TYPES } from '../../context/tutorialContext';
import './AIAssistant.css';

const AIAssistant = ({ 
  fileTree, 
  searchTerm, 
  username, 
  isAdmin, 
  isSuperAdmin = false,
  processOwners = {},
  onSuggestion 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bubbleResponse, setBubbleResponse] = useState('');
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [currentPage, setCurrentPage] = useState('unknown');

  // Hook do tutorial persistente
  const tutorial = useTutorial();

  // Detectar página atual
  useEffect(() => {
    const detectCurrentPage = () => {
      const path = window.location.pathname;
      
      if (path === '/file' || path === '/home' || path === '/') {
        setCurrentPage('selectPdf');
      } else if (path.startsWith('/file/') || path.startsWith('/table/')) {
        // Rotas /file/:filename ou /table/:filename são páginas de template
        setCurrentPage('template');
      } else if (path === '/novo-procedimento' || path === '/newtable') {
        setCurrentPage('createProcedure');
      } else if (path === '/novo-processo') {
        setCurrentPage('createProcess');
      } else if (path === '/create-user') {
        setCurrentPage('createUser');
      } else if (path === '/reset-password') {
        setCurrentPage('firstLogin');
      } else {
        setCurrentPage('unknown');
      }      
      console.log('📍 Página atual detectada:', currentPage, '(path:', path, ')');
    };

    detectCurrentPage();
    
    // Detectar mudanças de navegação
    const handleNavigation = () => {
      setTimeout(detectCurrentPage, 300);
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleNavigation();
    };
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.history.pushState = originalPushState;
    };
  }, [currentPage]);

  // Funções para realce de elementos
  const highlightElement = (selector, scrollIntoView = true) => {
    // Remover destaques anteriores
    removeAllHighlights();
    
    const element = document.querySelector(selector);
    if (element) {
      // Adicionar classe de destaque
      element.classList.add('tutorial-highlight');
      setHighlightedElements([element]);
      
      // Scroll automático se necessário
      if (scrollIntoView) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
      
      console.log('✨ Elemento destacado:', selector);
      return element;
    } else {
      console.warn('⚠️ Elemento não encontrado para destacar:', selector);
      return null;
    }
  };

  const highlightMultipleElements = (selectors, scrollToFirst = true) => {
    removeAllHighlights();
    
    const elements = [];
    selectors.forEach(selector => {
      const foundElements = document.querySelectorAll(selector);
      foundElements.forEach(element => {
        element.classList.add('tutorial-highlight');
        elements.push(element);
      });
    });
    
    setHighlightedElements(elements);
    
    // Scroll para o primeiro elemento se necessário
    if (scrollToFirst && elements.length > 0) {
      setTimeout(() => {
        elements[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
    
    console.log('✨ Elementos destacados:', selectors, 'Total:', elements.length);
    return elements;
  };

  const removeAllHighlights = () => {
    // Remover destaques de elementos anteriores
    highlightedElements.forEach(element => {
      if (element && element.classList) {
        element.classList.remove('tutorial-highlight');
      }
    });
    
    // Também remover de qualquer elemento que possa ter ficado
    const allHighlighted = document.querySelectorAll('.tutorial-highlight');
    allHighlighted.forEach(element => {
      element.classList.remove('tutorial-highlight');
    });
    
    setHighlightedElements([]);
  };

  const scrollToElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      return element;
    }
    return null;
  };

  // Sistema automático de detectores baseado no passo atual
  useEffect(() => {
    if (!tutorial.isActive) {
      // Remover destaques se tutorial não estiver ativo
      removeAllHighlights();
      return;
    }
    
    console.log('🎯 Configurando detectores para:', tutorial.tutorialState);

    const setupCurrentStepDetector = () => {
      switch (tutorial.tutorialState) {
        case tutorial.TUTORIAL_STATES.STARTING:
          // No passo inicial, não destacar nada ainda
          removeAllHighlights();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCESS:
          // Destacar pastas de processos
          setupProcessSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCEDURE:
          // Destacar procedimentos/ficheiros
          setTimeout(() => checkProcedurePageAndAdvance(), 500);
          setTimeout(() => checkProcedurePageAndAdvance(), 1500);
          setupProcedureSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.NAVIGATE_TO_EDITOR:
          detectNavigationToEditor();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_EDIT_BUTTON:
          // Destacar botão de editar
          setupEditButtonDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_TABLE_ROW:
          // Destacar linhas da tabela
          setupTableRowDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_DOCUMENTS:
          // Destacar células de documentos
          setupDocumentsDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT:
          // Destacar botão de upload
          setupUploadDetector();
          break;
      }
    };

    const timeout = setTimeout(setupCurrentStepDetector, 500);
    return () => clearTimeout(timeout);
  }, [tutorial.tutorialState, tutorial.isActive]);

  // Detectar mudanças de URL para reconfigurar detectores
  useEffect(() => {
    if (!tutorial.isActive) return;
    
    const handleURLChange = () => {
      console.log('🔄 URL mudou, reconfigurando detectores...', window.location.pathname);
      // Reconfigurar detectores após mudança de página com delay maior para garantir que DOM carregou
      setTimeout(() => {
        if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCESS) {
          checkProcessPageAndAdvance();
        } else if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCEDURE) {
          checkProcedurePageAndAdvance();
        }
      }, 1500); // Aumentar delay para 1.5s
    };

    // Também detectar quando o DOM muda significativamente
    const observer = new MutationObserver((mutations) => {
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasSignificantChanges) {
        console.log('🔄 DOM mudou, verificando contexto...');
        setTimeout(() => {
          if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCEDURE) {
            checkProcedurePageAndAdvance();
          }
        }, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', handleURLChange);
    
    // Detectar navegação via History API
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleURLChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleURLChange();
    };

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', handleURLChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [tutorial.isActive, tutorial.tutorialState]);

  // Detectores individuais para cada passo
  const checkProcessPageAndAdvance = () => {
    // Verificar se já estamos numa página que mostra procedimentos de um processo específico
    const currentPath = window.location.pathname;
    const processElements = document.querySelectorAll('.process-content, .procedure-list, .file-list, [data-process-id]');
    const hasProcessTitle = document.querySelector('h1, h2, h3, .page-title')?.textContent?.includes('PROCESSO');
    
    console.log('🔍 Verificando página atual:', { currentPath, processElements: processElements.length, hasProcessTitle });
    
    // Se detectar que estamos numa página de processo com lista de procedimentos
    if (processElements.length > 0 || hasProcessTitle || 
        currentPath.includes('process') || currentPath.includes('tableDisplay')) {
      
      console.log('✅ Página de processo detectada! Avançando automaticamente...');
      setTimeout(() => {
        tutorial.nextStep({ selectedProcess: 'Processo detectado automaticamente' });
      }, 1000);
      return true;
    }
    return false;
  };

  const checkProcedurePageAndAdvance = () => {
    // Verificar se já estamos numa página de procedimento específico
    const currentPath = window.location.pathname;
    const templateElements = document.querySelectorAll('.template-container, .editor-container, .procedure-content, .tabela-template, [class*="template"], table');
    const hasTemplateTitle = document.querySelector('h1, h2, h3, .page-title, .template-title')?.textContent?.includes('Template');
    const hasTable = document.querySelector('table, .table, .tabela');
    const isTemplatePage = currentPath.includes('template') || currentPath.includes('Template') || currentPath.includes('TabelaTemplate');
    
    console.log('🔍 Verificando página de procedimento:', { 
      currentPath, 
      templateElements: templateElements.length, 
      hasTemplateTitle, 
      hasTable: !!hasTable,
      isTemplatePage 
    });
    
    // Se detectar que estamos numa página de template/procedimento
    if (templateElements.length > 0 || hasTemplateTitle || hasTable || isTemplatePage) {
      
      console.log('✅ Página de procedimento detectada! Avançando automaticamente...');
      setTimeout(() => {
        tutorial.nextStep({ selectedProcedure: 'Procedimento detectado automaticamente' });
      }, 1000);
      return true;
    }
    return false;
  };

  // Detectores individuais para cada passo
  const setupProcessSelector = () => {
    // Seletores específicos para a estrutura do selectPdf.jsx
    const folders = document.querySelectorAll('.folder-header');
    
    // Destacar APENAS processos onde o utilizador é proprietário
    const ownedProcesses = [];
    folders.forEach(folder => {
      const folderNameSpan = folder.querySelector('.folder-name');
      const folderName = folderNameSpan ? folderNameSpan.textContent?.trim() : folder.textContent?.trim();
      console.log('📁 Verificando pasta:', folderName, 'Owner:', processOwners[folderName]);
      
      // Verificar se o utilizador é dono deste processo
      if (processOwners[folderName] === username || isSuperAdmin) {
        console.log('✅ Destacando pasta própria:', folderName);
        folder.classList.add('tutorial-highlight');
        ownedProcesses.push(folder);
      }
    });
    
    console.log('📁 Processos próprios encontrados:', ownedProcesses.length);
    
    if (ownedProcesses.length > 0) {
      setHighlightedElements(ownedProcesses);
      // Scroll para o primeiro processo próprio
      ownedProcesses[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    folders.forEach(folder => {
      const handleClick = (e) => {
        console.log('✅ Processo selecionado!');
        removeAllHighlights();
        tutorial.nextStep({ selectedProcess: folder.textContent || 'Processo' });
        folder.removeEventListener('click', handleClick);
      };
      folder.addEventListener('click', handleClick, { once: true });
    });
  };

  const setupProcedureSelector = () => {
    const procedures = document.querySelectorAll('.file-item, .table-item, [data-filename], a[href*="template"]');
    console.log('📄 Detectores de procedimento:', procedures.length);
    
    // Destacar todos os procedimentos/ficheiros
    if (procedures.length > 0) {
      const selectors = ['.file-item', '.table-item', '[data-filename]', 'a[href*="template"]'];
      highlightMultipleElements(selectors, true);
    }
    
    procedures.forEach(procedure => {
      const handleClick = (e) => {
        console.log('✅ Procedimento selecionado!');
        removeAllHighlights();
        tutorial.nextStep({ selectedProcedure: procedure.textContent || 'Procedimento' });
        procedure.removeEventListener('click', handleClick);
      };
      procedure.addEventListener('click', handleClick, { once: true });
    });
  };

  const detectNavigationToEditor = () => {
    console.log('🔄 Detectando navegação...');
    
    if (window.location.pathname.includes('template') || 
        document.querySelector('.template-container, .editor-container')) {
      setTimeout(() => {
        console.log('✅ Página de edição detectada!');
        tutorial.nextStep({ navigatedToEditor: true });
      }, 1000);
    } else {
      const checkNavigation = setInterval(() => {
        if (window.location.pathname.includes('template') || 
            document.querySelector('.template-container, .editor-container')) {
          clearInterval(checkNavigation);
          console.log('✅ Navegação detectada!');
          tutorial.nextStep({ navigatedToEditor: true });
        }
      }, 1000);
      
      setTimeout(() => clearInterval(checkNavigation), 10000);
    }
  };

  const setupEditButtonDetector = () => {
    const editButtons = document.querySelectorAll('button, .btn, [role="button"]');
    console.log('✏️ Detectores de edição:', editButtons.length);
    
    // Encontrar e destacar botões de editar
    const editButtonsFiltered = Array.from(editButtons).filter(button => {
      const text = button.textContent?.toLowerCase() || '';
      return text.includes('editar') || text.includes('edit') || button.type === 'submit';
    });
    
    if (editButtonsFiltered.length > 0) {
      // Destacar apenas botões de edição relevantes
      editButtonsFiltered.forEach(button => {
        button.classList.add('tutorial-highlight');
      });
      setHighlightedElements(editButtonsFiltered);
      
      // Scroll para o primeiro botão
      editButtonsFiltered[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    editButtons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      if (text.includes('editar') || text.includes('edit') || button.type === 'submit') {
        const handleClick = (e) => {
          console.log('✅ Edição ativada!');
          removeAllHighlights();
          tutorial.nextStep({ editActivated: true });
          button.removeEventListener('click', handleClick);
        };
        button.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  const setupTableRowDetector = () => {
    const rows = document.querySelectorAll('tr, .table-row, td');
    console.log('📋 Detectores de linha:', rows.length);
    
    // NÃO destacar tabelas - apenas detectar cliques
    rows.forEach(row => {
      const handleClick = (e) => {
        if (row.tagName === 'TH' || row.closest('thead')) return;
        console.log('✅ Linha selecionada!');
        removeAllHighlights();
        tutorial.nextStep({ rowSelected: true });
        row.removeEventListener('click', handleClick);
      };
      row.addEventListener('click', handleClick, { once: true });
    });
  };

  const setupDocumentsDetector = () => {
    const docElements = document.querySelectorAll('td, .cell, .documentos-associados, [data-documentos]');
    console.log('📎 Detectores de documentos:', docElements.length);
    
    // Encontrar e destacar células de documentos
    const docCells = Array.from(docElements).filter(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      return text.includes('documento') || text.includes('anexo') || className.includes('document');
    });
    
    if (docCells.length > 0) {
      docCells.forEach(cell => {
        cell.classList.add('tutorial-highlight');
      });
      setHighlightedElements(docCells);
      
      // Scroll para a primeira célula de documentos
      docCells[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    docElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      
      if (text.includes('documento') || text.includes('anexo') || 
          className.includes('document')) {
        const handleClick = (e) => {
          console.log('✅ Documentos clicados!');
          removeAllHighlights();
          tutorial.nextStep({ documentsClicked: true });
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  const setupUploadDetector = () => {
    const uploadElements = document.querySelectorAll('button, .btn, input[type="file"], [class*="upload"]');
    console.log('📤 Detectores de upload:', uploadElements.length);
    
    // Encontrar e destacar botões/elementos de upload
    const uploadButtonsFiltered = Array.from(uploadElements).filter(element => {
      const text = element.textContent?.toLowerCase() || '';
      return text.includes('enviar') || text.includes('upload') || 
             text.includes('novo documento') || element.type === 'file';
    });
    
    if (uploadButtonsFiltered.length > 0) {
      uploadButtonsFiltered.forEach(element => {
        element.classList.add('tutorial-highlight');
      });
      setHighlightedElements(uploadButtonsFiltered);
      
      // Scroll para o primeiro elemento de upload
      uploadButtonsFiltered[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    uploadElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      if (text.includes('enviar') || text.includes('upload') || 
          text.includes('novo documento') || element.type === 'file') {
        const handleClick = (e) => {
          console.log('✅ Upload iniciado! Tutorial completo! 🎉');
          removeAllHighlights();
          tutorial.completeTutorial();
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  // Função para obter mensagem do tutorial atual
  const getCurrentTutorialMessage = () => {
    if (!tutorial.isActive) return null;
    
    const stepData = tutorial.getCurrentStepMessage();
    if (!stepData) return 'Tutorial em progresso...';
    
    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
          {stepData.title}
        </div>
        <div style={{ fontSize: '13px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
          {stepData.message}
        </div>
        <div style={{ 
          marginTop: '10px', 
          padding: '6px 10px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '6px',
          fontSize: '12px',
          fontStyle: 'italic',
          color: '#6b7280'
        }}>
          {stepData.action}
        </div>
        {/* Botão "Começar" apenas no passo inicial */}
        {stepData.showStartButton && (() => {
          // Verificar se o user tem processos atribuídos antes de mostrar o botão
          // SuperAdmin tem acesso a todos os processos
          const userOwnsProcess = isSuperAdmin || (processOwners && Object.values(processOwners).includes(username));
          
          if (!userOwnsProcess) {
            return (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#991b1b'
              }}>
                🔒 Não pode iniciar o tutorial porque não é proprietário de nenhum processo. Contacte um Super Admin.
              </div>
            );
          }
          
          return (
            <button
              onClick={() => {
                console.log('🚀 Utilizador clicou em "Começar"');
                tutorial.nextStep();
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#16a34a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#22c55e'}
            >
              🚀 Começar Tutorial
            </button>
          );
        })()}
      </div>
    );
  };

  // Função auxiliar para enviar dados da pergunta para a API
  const logQuestionToAPI = async (question, hasLocalAnswer = false, responseType = null) => {
    try {
      await fetch("https://api9001.duckdns.org/api/assistant/log", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          username: username,
          currentPage: currentPage,
          hasLocalAnswer: hasLocalAnswer,
          responseType: responseType,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao registar pergunta na API:', error);
    }
  };

  // Processar pergunta simples no balão
  const handleBubbleQuestion = () => {
    if (!userInput.trim()) return;
    
    setIsTyping(true);
    const question = userInput.toLowerCase();
    const userOwnsProcess = isSuperAdmin || (processOwners && Object.values(processOwners).includes(username));
    
    setTimeout(() => {
      let response = '';
      let actionType = null;
      let hasLocalAnswer = true;
      
      // Respostas contextuais baseadas na página atual
      if (question.includes('pesquis') || question.includes('procur') || question.includes('encontr') || question.includes('search')) {
        if (currentPage !== 'selectPdf') {
          response = '🔍 Para pesquisar ficheiros, precisa voltar à página principal!\n\n📂 Clique no logotipo ISO 9001 no topo esquerdo para voltar à lista de ficheiros onde está a barra de pesquisa.';
          actionType = 'searchFromOther';
        } else {
          response = '🔍 Use a barra de pesquisa no topo para encontrar ficheiros rapidamente!';
          actionType = 'search';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('ficheiro') || question.includes('file') || question.includes('documento') || question.includes('pdf')) {
        if (currentPage !== 'selectPdf') {
          response = '📄 Para ver ficheiros, volte à página principal:\n\n🏠 Clique no logotipo ISO 9001 no topo para voltar à lista completa\n🔍 Lá pode usar a pesquisa para encontrar o que precisa';
          actionType = 'fileNavigationFromOther';
        } else {
          response = '📁 Clique nas pastas "PROCESSO X:" para expandir e ver os ficheiros disponíveis.';
          actionType = 'folder';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('favorito') || question.includes('favoritos')) {
        if (currentPage !== 'selectPdf') {
          response = '⭐ Para gerir favoritos, volte à página principal:\n\n🏠 Clique no botão retroceder no topo para voltar à lista completa\n🔍 Lá pode usar a pesquisa para encontrar o que precisa';
          actionType = 'favoritesNavigation';
        } else {
          response = '⭐ Clique no ícone de estrela ao lado dos ficheiros para adicionar/remover dos favoritos.';
          actionType = 'favorites';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('adicionar linha') || question.includes('nova linha') || question.includes('linha')) {
        if (!userOwnsProcess) {
          response = '🔒 Não pode adicionar linhas, remover ou mover porque não é proprietário de nenhum processo. Apenas proprietários de processos ou Super Admins podem editar procedimentos. Contacte um Super Admin para ter processos atribuídos.';
          actionType = 'addTableRow';
        } else if (currentPage === 'template') {
          response = ' ➕ Para adicionar uma nova linha, ative o modo edição clicando no botão "Editar" e depois use o botão direito do rato na tabela para adicionar, remover ou mover uma linha.';
          actionType = 'addTableRowFromOther';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (
        (question.includes('processo') || question.includes('processos'))
      ) {
        if (isSuperAdmin) {
          response = '🏢 Como Super Admin, pode criar novos processos:\n• 📋 Definir estrutura\n• 👤 Atribuir responsáveis\n• 📄 Configurar templates\n• 🔧 Definir permissões';
          actionType = 'processManagement';
        } else {
          response = '🔐 Apenas Super Admins podem criar novos processos. Contacte um Super Admin se precisar de um novo processo.';
          actionType = 'permissions';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('pasta') || question.includes('abrir') || question.includes('naveg')) {
        if (currentPage === 'selectPdf') {
          response = '📁 Clique nas pastas "PROCESSO X:" para expandir e ver os ficheiros.';
          actionType = 'folder';
        } else {
          response = '📁 Para navegar pelas pastas, volte à página principal clicando no logotipo ISO 9001 no topo.';
          actionType = 'folderFromOther';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('criar') || question.includes('novo') || question.includes('adicion') || question.includes('procedimento')) {
        if (isSuperAdmin) {
          response = '⚡ Como Super Admin, pode criar:\n• ➕ Novos procedimentos\n• 👥 Novos utilizadores\n• 🏢 Novos processos\n• 🔧 Configurações do sistema';
          actionType = 'superAdminCreate';
        } else {
          if (currentPage !== 'selectPdf') {
            response = '➕ Para criar procedimentos, volte à página principal e clique no botão + ao lado da pasta desejada.';
            actionType = 'createFromOther';
          } else {
            response = '👉➕ Use o botão + ao lado das pastas para criar novos procedimentos.';
            actionType = 'create';
          }
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('utilizador') || question.includes('user') || question.includes('conta')) {
        if (isSuperAdmin) {
          if (currentPage !== 'selectPdf') {
            response = '👥 Para gerir utilizadores, vá à página de gestão:\n\n1️⃣ Use o menu de navegação\n2️⃣ Ou clique no link de gestão de utilizadores\n3️⃣ Lá pode criar/editar/remover utilizadores';
            actionType = 'userManagementNavigation';
          } else {
            response = '👥 Como Super Admin, pode gerir utilizadores:\n• ➕ Criar novos utilizadores\n• ✏️ Editar perfis\n• 🔒 Gerir permissões\n• 🗑️ Remover utilizadores';
            actionType = 'userManagement';
          }
        } else {
          response = '🔐 Apenas Super Admins podem gerir utilizadores.';
          actionType = 'permissions';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('permiss') || question.includes('ajuda') || question.includes('posso')) {
          let capabilities = [];
          if (isSuperAdmin) {
            capabilities = [
              '👑 Super Admin - Acesso total:',
              '• Criar/editar todos os processos',
              '• Gerir utilizadores e permissões',
              '• Configurar sistema',
              '• Criar novos processos',
              '• Acesso a todas as funcionalidades',
            ];
          } else if (isAdmin) {
            capabilities = [
              '🔧 Admin - Acesso avançado:',
              '• Editar todos os processos',
              '• Ver todos os documentos',
              '• Gerir procedimentos',
              '• Não pode criar utilizadores/processos'
            ];
          } else {
            // Verifica se o user tem processos atribuídos
            const userHasProcess = Object.values(processOwners).includes(username);
            capabilities = [
              '👤 Utilizador - Acesso limitado:',
              userHasProcess
                ? '• Editar apenas processos atribuídos (realçados a amarelo)'
                : '• Não tem processos atribuídos para editar',
              '• Ver documentos permitidos',
              '• Anexar documentos'
            ];
          }
          response = capabilities.join('\n');
          actionType = 'permissions';
          logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('anexo') || question.includes('documento') || question.includes('anexar')) {
        if (!userOwnsProcess) {
          response = '🔒 Não pode anexar documentos porque não é proprietário de nenhum processo. Apenas proprietários de processos ou Super Admins podem anexar documentos. Contacte um Super Admin para ter processos atribuídos.';
          actionType = 'permissions';
        } else if (currentPage !== 'selectPdf' && (currentPage === 'template' || document.querySelector('table.main-table, .tabela-template'))) {
          response = '📎 Está na página certa! Vou iniciar o tutorial de anexos. Siga os passos para aprender a anexar documentos corretamente.';
          actionType = 'attachment';
          setTimeout(() => {
            tutorial.startTutorial();
          }, 1500);
        } else {
          response = '📎 Para anexar documentos:\n\n1️⃣ Primeiro vá à página principal (clique no logotipo)\n2️⃣ Selecione um procedimento para abrir\n3️⃣ Depois pode anexar documentos nas tabelas\n\nOu posso iniciar o tutorial de anexos que o guiará por todo o processo!';
          actionType = 'attachmentFromOther';
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('tutorial') || question.includes('anexar') || question.includes('como')) {
        if (!userOwnsProcess) {
          response = '🔒 Não pode iniciar o tutorial de anexos porque não é proprietário de nenhum processo. Apenas proprietários de processos ou Super Admins podem anexar documentos. Contacte um Super Admin para ter processos atribuídos.';
          actionType = 'permissions';
        } else {
          response = '🎯 Iniciando tutorial de anexos! Vou guiá-lo através do processo completo passo a passo.';
          actionType = 'tutorial';
          setTimeout(() => {
            tutorial.startTutorial();
          }, 1500);
        }
        logQuestionToAPI(userInput, true, actionType);
      } else if (question.includes('onde') || question.includes('página') || question.includes('pagina') || question.includes('estou')) {
        let pageDescription = '';
        switch (currentPage) {
          case 'selectPdf':
            pageDescription = '📂 Está na página principal (lista de ficheiros).\n\nAqui pode:\n• 🔍 Pesquisar ficheiros\n• 📁 Navegar pelas pastas\n• ➕ Criar novos procedimentos\n• 👁️ Visualizar ficheiros';
            break;
          case 'template':
            pageDescription = '📄 Está a visualizar um procedimento/template.\n\nAqui pode:\n• ✏️ Editar tabelas\n• 📎 Anexar documentos\n• 💾 Guardar alterações\n• 🏠 Voltar à lista (clique no logotipo)';
            break;
          case 'createProcedure':
            pageDescription = '➕ Está na página de criar novo procedimento.\n\nAqui pode:\n• 📝 Definir nome e detalhes\n• 📊 Escolher template\n• 💾 Criar o procedimento';
            break;
          case 'createProcess':
            pageDescription = '🏢 Está na página de criar novo processo.\n\nAqui pode:\n• 📋 Definir estrutura\n• 👤 Atribuir responsáveis\n• 💾 Criar o processo';
            break;
          default:
            pageDescription = '❓ Página não identificada. Use o logotipo no topo para navegar para a página principal.';
        }
        response = pageDescription;
        actionType = 'pageInfo';
        logQuestionToAPI(userInput, true, actionType);
      } else {
        // Enviar pergunta para API para guardar e tentar obter resposta
        fetch("https://api9001.duckdns.org/api/assistant", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: userInput.trim(),
            username: username,
            currentPage: currentPage,
            timestamp: new Date().toISOString()
          })
        })
        .then((res) => res.json())
        .then((data) => {
          if (data.answer) {
            response = data.answer;
            actionType = 'api';
          } else {
            response = `🤖 Ah, não te consigo ajudar com essa pergunta... mas eis onde consigo dar uma mão:
                         • Pesquisa e navegação
                         • Localização atual
                         • Criação de procedimentos
                         • Permissões
                         • Anexos
                         
                         Diz-me em qual destas áreas precisas de ajuda!`;
            actionType = 'general';
          }
          
          setBubbleResponse(response);
          setIsTyping(false);
          setUserInput('');
          
          if (actionType && actionType !== 'attachment' && actionType !== 'tutorial' && actionType !== 'attachmentFromOther') {
            setupResponseDetector(actionType);
          } else if (actionType === 'general' || actionType === 'pageInfo') {
            setTimeout(() => setBubbleResponse(''), 15000);
          }
        })
        .catch((error) => {
          console.error('Erro ao enviar pergunta para API:', error);
          response = `🤖 Ah, não te consigo ajudar com essa pergunta... mas eis onde consigo dar uma mão:
                       • Pesquisa e navegação
                       • Localização atual
                       • Criação de procedimentos
                       • Permissões
                       • Anexos
                       
                       Diz-me em qual destas áreas precisas de ajuda!`;
          actionType = 'general';
          
          setBubbleResponse(response);
          setIsTyping(false);
          setUserInput('');
          
          if (actionType && actionType !== 'attachment' && actionType !== 'tutorial' && actionType !== 'attachmentFromOther') {
            setupResponseDetector(actionType);
          } else if (actionType === 'general' || actionType === 'pageInfo') {
            setTimeout(() => setBubbleResponse(''), 15000);
          }
        });
        return; // Sair aqui para não executar o código abaixo
      }
      
      // Para outras perguntas com respostas locais
      setBubbleResponse(response);
      setIsTyping(false);
      setUserInput('');
      
      if (actionType && actionType !== 'attachment' && actionType !== 'tutorial' && actionType !== 'attachmentFromOther') {
        setupResponseDetector(actionType);
      } else if (actionType === 'general' || actionType === 'pageInfo') {
        setTimeout(() => setBubbleResponse(''), 15000);
      }
    }, 1000);
  };

  // Lidar com Enter no input do balão
  const handleBubbleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBubbleQuestion();
    }
  };

  // Configurar detectores para limpar resposta quando ação é executada
  const setupResponseDetector = (actionType) => {
    const clearResponse = () => setBubbleResponse('');
    
    switch (actionType) {
      case 'search':
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          // Destacar barra de pesquisa
          highlightElement('input[type="text"]', true);
          
          const handleSearchInteraction = () => {
            clearResponse();
            removeAllHighlights();
            searchInput.removeEventListener('focus', handleSearchInteraction);
            searchInput.removeEventListener('input', handleSearchInteraction);
          };
          searchInput.addEventListener('focus', handleSearchInteraction);
          searchInput.addEventListener('input', handleSearchInteraction);
        }
        break;
      
      case 'searchFromTemplate':
      case 'searchOther':
        // Destacar logotipo para voltar à página principal
        const logo = document.querySelector('.navbar-brand, .logo, a[href="/file"], a[href="/home"]');
        if (logo) {
          highlightElement('.navbar-brand, .logo, a[href="/file"], a[href="/home"]', true);
          
          const handleLogoClick = () => {
            clearResponse();
            removeAllHighlights();
            logo.removeEventListener('click', handleLogoClick);
          };
          logo.addEventListener('click', handleLogoClick, { once: true });
        }
        setTimeout(clearResponse, 20000);
        break;
      
      case 'fileNavigation':
      case 'folderFromOther':
      case 'createFromOther':
      case 'fileNavigationOther':
        // Destacar logotipo para navegação
        const navLogo = document.querySelector('.navbar-brand, .logo, a[href="/file"], a[href="/home"]');
        if (navLogo) {
          highlightElement('.navbar-brand, .logo, a[href="/file"], a[href="/home"]', true);
          
          const handleNavClick = () => {
            clearResponse();
            removeAllHighlights();
            navLogo.removeEventListener('click', handleNavClick);
          };
          navLogo.addEventListener('click', handleNavClick, { once: true });
        }
        setTimeout(clearResponse, 20000);
        break;
      
      case 'attachmentFromOther':
        // Sugerir voltar à página principal ou iniciar tutorial
        setTimeout(() => {
          if (bubbleResponse.includes('tutorial')) {
            setBubbleResponse(prev => prev + '\n\n🚀 Quer iniciar o tutorial agora? Digite "tutorial"');
          }
        }, 3000);
        setTimeout(clearResponse, 25000);
        break;
        
      case 'folder':
        // Seletores específicos para a estrutura do selectPdf.jsx
        const folders = document.querySelectorAll('.folder-header');
        console.log('📁 Detectores de navegação:', folders.length);
        
        // Destacar APENAS processos onde o utilizador é proprietário
        const ownedFolders = [];
        folders.forEach(folder => {
          const folderNameSpan = folder.querySelector('.folder-name');
          const folderName = folderNameSpan ? folderNameSpan.textContent?.trim() : folder.textContent?.trim();
          console.log('📁 Navegação - verificando pasta:', folderName, 'Owner:', processOwners[folderName]);
          
          // Verificar se o utilizador é dono deste processo
          if (processOwners[folderName] === username || isSuperAdmin) {
            console.log('✅ Destacando pasta própria para navegação:', folderName);
            folder.classList.add('tutorial-highlight');
            ownedFolders.push(folder);
          }
        });
        
        if (ownedFolders.length > 0) {
          setHighlightedElements(ownedFolders);
        }
        
        folders.forEach(folder => {
          const handleFolderClick = () => {
            clearResponse();
            removeAllHighlights();
            folder.removeEventListener('click', handleFolderClick);
          };
          folder.addEventListener('click', handleFolderClick);
        });
        break;
        
      case 'create':
        const createButtons = document.querySelectorAll('.create-table-btn, [data-action="create"], .add-process-btn, .plus-btn');
        if (createButtons.length > 0) {
          // Destacar botões de criar com seta à esquerda
          createButtons.forEach(button => {
            button.classList.add('tutorial-highlight');
            button.classList.add('tutorial-highlight-left');
          });
          setHighlightedElements([...createButtons]);
        }
        
        createButtons.forEach(button => {
          const handleCreateClick = () => {
            clearResponse();
            removeAllHighlights();
            button.removeEventListener('click', handleCreateClick);
          };
          button.addEventListener('click', handleCreateClick);
        });
        break;
      
      case 'pageInfo':
        // Não fazer nada especial, apenas limpar após timeout
        setTimeout(clearResponse, 15000);
        break;
        
      default:
        setTimeout(clearResponse, 15000);
    }
  };

  // Limpar highlights quando componente desmontar
  useEffect(() => {
    return () => {
      removeAllHighlights();
    };
  }, []);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="ai-assistant">
      {/* Botão flutuante */}
      <button 
        className="ai-assistant__toggle"
        onClick={toggleWidget}
        title="Assistente de navegação"
      >
        🤖
      </button>

      {/* Balão de fala do tutorial */}
      {tutorial.isActive && (
        <div className="ai-assistant__bubble ai-assistant__bubble--info">
          <button 
            className="ai-assistant__bubble-close"
            onClick={() => {
              tutorial.stopTutorial();
              removeAllHighlights();
            }}
            title="Fechar tutorial"
          >
            ✕
          </button>
          {getCurrentTutorialMessage()}
        </div>
      )}

      {/* Balão de fala simples para mensagens normais */}
      {isOpen && !tutorial.isActive && (
        <div className="ai-assistant__bubble">
          <button 
            className="ai-assistant__bubble-close"
            onClick={() => setIsOpen(false)}
            title="Fechar"
          >
            ✕
          </button>
          <div>
            <strong>🤖 Assistente ISO 9001</strong>
            <br />
            {bubbleResponse ? (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre-line' }}>
                {bubbleResponse}
              </div>
            ) : (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                {isTyping ? '⌨️ A processar...' : 'Como posso ajudar?'}
              </div>
            )}
            
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleBubbleKeyPress}
                placeholder="Digite sua pergunta..."
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                disabled={isTyping}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
