import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './RowContextMenuNew.css';

const useRowContextMenu = ({ 
  totalRows,
  onMoveRowUp, 
  onMoveRowDown, 
  onInsertRowAbove, 
  onInsertRowBelow, 
  onDeleteRow 
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

  const menuItems = [
    {
      label: 'Mover para cima',
      icon: '↑',
      action: () => handleAction(onMoveRowUp, currentRowIndex),
      disabled: currentRowIndex === 0,
      className: 'move-up'
    },
    {
      label: 'Mover para baixo',
      icon: '↓',
      action: () => handleAction(onMoveRowDown, currentRowIndex),
      disabled: currentRowIndex === totalRows - 1,
      className: 'move-down'
    },
    { type: 'separator' },
    {
      label: 'Inserir linha acima',
      icon: '⬆',
      action: () => handleAction(onInsertRowAbove, currentRowIndex),
      className: 'insert-above'
    },
    {
      label: 'Inserir linha abaixo',
      icon: '⬇',
      action: () => handleAction(onInsertRowBelow, currentRowIndex),
      className: 'insert-below'
    },
    { type: 'separator' },
    {
      label: 'Apagar linha',
      icon: '🗑',
      action: () => handleAction(onDeleteRow, currentRowIndex),
      disabled: totalRows <= 1,
      className: 'delete-row'
    }
  ];

  const contextMenu = isOpen ? createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 999999
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="context-menu-separator" />;
        }

        return (
          <button
            key={index}
            className={`context-menu-item ${item.className || ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={item.action}
            disabled={item.disabled}
          >
            <span className="context-menu-icon">{item.icon}</span>
            <span className="context-menu-label">{item.label}</span>
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
