import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowUp, FaArrowDown, FaTrashCan, FaArrowTurnUp, FaArrowTurnDown } from 'react-icons/fa6';

const useRowContextMenu = ({ 
  totalRows,
  onMoveRowUp, 
  onMoveRowDown, 
  onInsertRowAbove, 
  onInsertRowBelow, 
  onDeleteRow,
  cellContextMenu // optional: array of cell-specific menu items
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const menuRef = useRef(null);

  const handleContextMenuEvent = (e, rowIndex) => {
    e.preventDefault();
    setCurrentRowIndex(rowIndex);
    
    // Calcular posição do menu evitando que saia da tela
    let x = e.clientX;
    let y = e.clientY;
    
    const menuWidth = 180;
    const menuHeight = 200;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setPosition({ x, y });
    setIsOpen(true);
  };

  const handleContextMenu = (rowIndex) => (e) => {
    handleContextMenuEvent(e, rowIndex);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleAction = (action, ...args) => {
    action(...args);
    closeMenu();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    if (isOpen) {
      // Adicionar listeners com um pequeno delay para evitar o fechamento imediato
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('scroll', handleScroll);
        // Removido o listener de contextmenu que estava causando o problema
      }, 10);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  const baseMenuItems = [
    {
      label: 'Mover para cima',
      icon: <FaArrowUp size={12} />,
      action: () => handleAction(onMoveRowUp, currentRowIndex),
      disabled: currentRowIndex === 0,
      className: 'move-up'
    },
    {
      label: 'Mover para baixo',
      icon: <FaArrowDown size={12} />,
      action: () => handleAction(onMoveRowDown, currentRowIndex),
      disabled: currentRowIndex === totalRows - 1,
      className: 'move-down'
    },
    { type: 'separator' },
    {
      label: 'Inserir linha acima',
      icon: <FaArrowTurnUp size={12} />,
      action: () => handleAction(onInsertRowAbove, currentRowIndex),
      className: 'insert-above'
    },
    {
      label: 'Inserir linha abaixo',
      icon: <FaArrowTurnDown size={12} />,
      action: () => handleAction(onInsertRowBelow, currentRowIndex),
      className: 'insert-below'
    },
    { type: 'separator' },
    {
      label: 'Apagar linha',
      icon: <FaTrashCan size={12} />,
      action: () => handleAction(onDeleteRow, currentRowIndex),
      disabled: totalRows <= 1,
      className: 'delete-row'
    }
  ];

  // Final menu items
  let menuItems = baseMenuItems;
  
  // Add cell-specific menu items if provided
  if (cellContextMenu && cellContextMenu.length > 0) {
    menuItems = [...cellContextMenu, { type: 'separator' }, ...baseMenuItems];
  }

  const getItemClasses = (item) => {
    const base = "flex items-center w-full px-3 py-2 border-0 bg-transparent text-left cursor-pointer text-[14px] text-[#333] transition-colors duration-150 gap-2.5 hover:enabled:bg-gray-100 disabled:text-[#999] disabled:cursor-not-allowed";
    const variantMap = {
      'delete-row': 'hover:bg-red-50 hover:text-red-600',
      'move-up': 'text-blue-600',
      'move-down': 'text-blue-600',
      'insert-above': 'text-green-600',
      'insert-below': 'text-green-600',
    };
    const variant = item.className ? (variantMap[item.className] || '') : '';
    return `${base} ${variant}`.trim();
  };

  const contextMenu = isOpen ? createPortal(
    <div
      ref={menuRef}
      className="bg-white border border-[#ddd] rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] py-1 min-w-[180px] max-w-[250px] animate-contextMenuFadeIn z-[999999] fixed block visible opacity-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-px bg-[#eee] my-1" />;
        }

        return (
          <button
            key={index}
            className={getItemClasses(item)}
            onClick={item.action}
            disabled={item.disabled}
          >
            <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0">{item.icon}</span>
            <span className="flex-1 whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return {
    handleContextMenu,
    handleContextMenuEvent,
    contextMenu
  };
};

export default useRowContextMenu;
