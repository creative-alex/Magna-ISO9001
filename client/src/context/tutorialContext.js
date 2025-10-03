import React, { createContext, useContext, useState, useEffect } from 'react';

const TutorialContext = createContext();

// Estados possíveis do tutorial
export const TUTORIAL_STATES = {
  INACTIVE: 'inactive',
  STARTING: 'starting',
  SELECT_PROCESS: 'select_process',           // 1. Abrir processo alvo
  SELECT_PROCEDURE: 'select_procedure',       // 2. Abrir procedimento para anexar
  NAVIGATE_TO_EDITOR: 'navigate_to_editor',   // Tutorial segue para página do procedimento
  CLICK_EDIT_BUTTON: 'click_edit_button',     // 3. Carregar no botão editar
  SELECT_TABLE_ROW: 'select_table_row',       // 4. Escolher linha para associar documento
  CLICK_DOCUMENTS: 'click_documents',         // 5. Carregar em "documentos"
  UPLOAD_NEW_DOCUMENT: 'upload_new_document', // 6. Carregar em "Enviar novo Documento"
  COMPLETE: 'complete'
};

// Tipos de tutorial
export const TUTORIAL_TYPES = {
  ATTACHMENTS: 'attachments',
  NAVIGATION: 'navigation',
  CREATE_PROCEDURE: 'create_procedure'
};

// Chaves do localStorage
const STORAGE_KEYS = {
  TUTORIAL_STATE: 'ai_tutorial_state',
  TUTORIAL_TYPE: 'ai_tutorial_type',
  TUTORIAL_DATA: 'ai_tutorial_data',
  TUTORIAL_PROGRESS: 'ai_tutorial_progress'
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial deve ser usado dentro de um TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const [tutorialState, setTutorialState] = useState(TUTORIAL_STATES.INACTIVE);
  const [tutorialType, setTutorialType] = useState(null);
  const [tutorialData, setTutorialData] = useState({});
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Carregar estado do localStorage quando o componente monta
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEYS.TUTORIAL_STATE);
    const savedType = localStorage.getItem(STORAGE_KEYS.TUTORIAL_TYPE);
    const savedData = localStorage.getItem(STORAGE_KEYS.TUTORIAL_DATA);
    const savedProgress = localStorage.getItem(STORAGE_KEYS.TUTORIAL_PROGRESS);

    if (savedState && savedState !== TUTORIAL_STATES.INACTIVE) {
      setTutorialState(savedState);
      setTutorialType(savedType);
      setTutorialData(savedData ? JSON.parse(savedData) : {});
      setTutorialProgress(savedProgress ? parseInt(savedProgress) : 0);
      setIsActive(true);
    }
  }, []);

  // Salvar estado no localStorage sempre que mudar
  useEffect(() => {
    if (tutorialState !== TUTORIAL_STATES.INACTIVE) {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_STATE, tutorialState);
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_TYPE, tutorialType || '');
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_DATA, JSON.stringify(tutorialData));
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_PROGRESS, tutorialProgress.toString());
    } else {
      // Limpar localStorage quando tutorial estiver inativo
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }, [tutorialState, tutorialType, tutorialData, tutorialProgress]);

  // Iniciar tutorial
  const startTutorial = (type, initialData = {}) => {
    console.log('🎯 Iniciando tutorial:', type);
    setTutorialType(type);
    setTutorialData(initialData);
    setTutorialProgress(1);
    setIsActive(true);

    switch (type) {
      case TUTORIAL_TYPES.ATTACHMENTS:
        setTutorialState(TUTORIAL_STATES.STARTING);
        break;
      case TUTORIAL_TYPES.NAVIGATION:
        setTutorialState(TUTORIAL_STATES.SELECT_PROCESS);
        break;
      default:
        setTutorialState(TUTORIAL_STATES.STARTING);
    }
  };

  // Avançar para o próximo passo
  const nextStep = (newData = {}) => {
    const updatedData = { ...tutorialData, ...newData };
    setTutorialData(updatedData);
    setTutorialProgress(prev => prev + 1);

    console.log('➡️ Próximo passo do tutorial:', tutorialState, '->', getNextState());
    
    const nextState = getNextState();
    if (nextState) {
      setTutorialState(nextState);
    }
  };

  // Determinar próximo estado baseado no atual
  const getNextState = () => {
    switch (tutorialState) {
      case TUTORIAL_STATES.STARTING:
        return TUTORIAL_STATES.SELECT_PROCESS;
      case TUTORIAL_STATES.SELECT_PROCESS:
        return TUTORIAL_STATES.SELECT_PROCEDURE;
      case TUTORIAL_STATES.SELECT_PROCEDURE:
        return TUTORIAL_STATES.CLICK_EDIT_BUTTON;
      case TUTORIAL_STATES.CLICK_EDIT_BUTTON:
        return TUTORIAL_STATES.SELECT_TABLE_ROW;
      case TUTORIAL_STATES.SELECT_TABLE_ROW:
        return TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT;
      case TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT:
        return TUTORIAL_STATES.COMPLETE;
      default:
        return null;
    }
  };

  // Pular para um passo específico
  const goToStep = (state, newData = {}) => {
    console.log('🎯 Pulando para passo:', state);
    setTutorialState(state);
    setTutorialData({ ...tutorialData, ...newData });
  };

  // Parar tutorial
  const stopTutorial = () => {
    console.log('⏹️ A parar o tutorial');
    setTutorialState(TUTORIAL_STATES.INACTIVE);
    setTutorialType(null);
    setTutorialData({});
    setTutorialProgress(0);
    setIsActive(false);
  };

  // Completar tutorial
  const completeTutorial = () => {
    console.log('🎉 Tutorial concluído!');
    setTutorialState(TUTORIAL_STATES.COMPLETE);
    // Removido o setTimeout - o tutorial só fecha quando o utilizador clicar no X
  };

  // Pausar tutorial (mantém estado mas para execução)
  const pauseTutorial = () => {
    setIsActive(false);
  };

  // Retomar tutorial
  const resumeTutorial = () => {
    if (tutorialState !== TUTORIAL_STATES.INACTIVE) {
      setIsActive(true);
    }
  };

  // Verificar se estamos em um passo específico
  const isInStep = (state) => {
    return tutorialState === state && isActive;
  };

  // Obter mensagem do passo atual
  const getCurrentStepMessage = () => {
    const messages = {
      [TUTORIAL_STATES.STARTING]: {
        title: '📎 Tutorial de Anexos - Início',
        message: '🚀 **Vamos aprender a associar documentos!**\n\nEste tutorial irá guiá-lo através de todos os passos necessários:\n\n1️⃣ **Abrir processo alvo**\n2️⃣ **Abrir procedimento**\n3️⃣ **Ativar edição**\n4️⃣ **Escolher linha**\n5️⃣ **Anexar documento**\n\n✨ **Quando estiver pronto, clique em "Começar"!**',
        action: 'Clique em "Começar" quando estiver pronto',
        showStartButton: true
      },
      [TUTORIAL_STATES.SELECT_PROCESS]: {
        title: '📎 Tutorial de Anexos - Passo 1/6',
        message: '📁 **1. Abrir processo alvo**\n\nPrimeiro, precisa selecionar o processo onde está o procedimento que quer editar.\n\n✨ **Clique numa pasta "PROCESSO X:" para expandir!**',
        action: 'Clique numa pasta de processo'
      },
      [TUTORIAL_STATES.SELECT_PROCEDURE]: {
        title: '📎 Tutorial de Anexos - Passo 2/6',
        message: '📄 **2. Abrir procedimento**\n\nÓtimo! Agora selecione o procedimento específico ao qual deseja anexar documentos.\n\n✨ **Clique num ficheiro de procedimento!**',
        action: 'Clique num procedimento'
      },
      [TUTORIAL_STATES.NAVIGATE_TO_EDITOR]: {
        title: '📎 Tutorial de Anexos - Transição',
        message: '🔄 **Navegar para página do procedimento...**\n\nO tutorial irá continuar automaticamente na página do procedimento.\n\n✨ **Aguarde o carregamento!**',
        action: 'Aguardando navegação...'
      },
      [TUTORIAL_STATES.CLICK_EDIT_BUTTON]: {
        title: '📎 Tutorial de Anexos - Passo 3/6',
        message: '✏️ **3. Carregar no botão editar**\n\nPara anexar documentos, primeiro precisa ativar o modo de edição do procedimento.\n\n✨ **Clique no botão "Editar" no canto superior direito da página!**',
        action: 'Clique no botão "Editar"'
      },
      [TUTORIAL_STATES.SELECT_TABLE_ROW]: {
        title: '📎 Tutorial de Anexos - Passo 4/6',
        message: ' **4. Escolher linha da tabela**\n\nNo modo de edição, escolha a linha da tabela onde vai anexar o documento.\nDepois, clique na célula da coluna **"Documentos Associados"**.\n\n✨ **Basta clicar em "Documentos" da linha escolhida!**',
        action: 'Clique numa linha da tabela'
      },
      [TUTORIAL_STATES.CLICK_DOCUMENTS]: {
        title: '📎 Tutorial de Anexos - Passo 5/6',
        message: '� **5. Carregar em "Documentos"**\n\nPerfeito! Agora na linha selecionada, procure pela coluna "Documentos Associados" e clique nela.\n\n✨ **Clique na célula de documentos da linha!**',
        action: 'Clique na célula de documentos'
      },
      [TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT]: {
        title: '📎 Tutorial de Anexos - Passo 6/6',
        message: '📤 **6. Enviar novo documento**\n\nÓtimo! Agora pode ver as opções de anexos.\n\n**Pode:**\n• 📤 **Enviar novo documento** - Upload de ficheiro\n• 📋 **Selecionar existente** - Escolher da biblioteca\n\n✨ **Para anexar um documento novo clique em "Enviar novo Documento"!**',
        action: 'Clique em "Enviar novo Documento"'
      },
      [TUTORIAL_STATES.COMPLETE]: {
        title: '📎 Tutorial Concluído! 🎉',
        message: '🎯 **Parabéns!** Tutorial de anexos concluído!\n\n**Aprendeu a:**\n✅ Navegar pelos processos\n✅ Abrir procedimentos para edição\n✅ Encontrar secção de documentos associados\n✅ Selecionar e fazer upload de documentos\n\n**Agora já sabe anexar documentos em qualquer procedimento!** 🚀',
        action: 'Tutorial concluído!'
      }
    };

    return messages[tutorialState] || null;
  };

  // Obter progresso percentual
  const getProgressPercentage = () => {
    const totalSteps = Object.keys(TUTORIAL_STATES).length - 2; // Excluir INACTIVE e COMPLETE
    return Math.min((tutorialProgress / totalSteps) * 100, 100);
  };

  const value = {
    // Estados
    tutorialState,
    tutorialType,
    tutorialData,
    tutorialProgress,
    isActive,

    // Verificações
    isInStep,
    getCurrentStepMessage,
    getProgressPercentage,

    // Controles
    startTutorial,
    nextStep,
    goToStep,
    stopTutorial,
    completeTutorial,
    pauseTutorial,
    resumeTutorial,

    // Constantes
    TUTORIAL_STATES,
    TUTORIAL_TYPES
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialContext;