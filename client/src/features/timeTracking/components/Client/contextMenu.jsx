import React, { useState, useEffect } from 'react';
import VacationButton from '../Shared/vacationButton';
import MedicalLeave from '../Shared/medicalLeave';
import VacationCalendar from './VacationCalendar';
import ManualOvertimeButton from './manualOvertime';

const ContextMenu = ({ visible, x, y, onClose, date, username, month, isAdmin = false, onOvertimeRegistered }) => {
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      if (visible && !showCalendar && !showOvertimeModal) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [visible, onClose, showCalendar, showOvertimeModal]);

  // Reset modal states when context menu closes
  useEffect(() => {
    if (!visible) {
      setShowCalendar(false);
      setShowOvertimeModal(false);
    }
  }, [visible]);

  const handleOpenCalendar = (e) => {
    e.stopPropagation();
    setShowCalendar(true);
  };

  const handleCloseCalendar = () => {
    setShowCalendar(false);
    onClose();
  };

  const handleOpenOvertimeModal = (e) => {
    e.stopPropagation();
    setShowOvertimeModal(true);
  };

  const handleCloseOvertimeModal = () => {
    setShowOvertimeModal(false);
    onClose();
  };

  const handleOvertimeRegistered = () => {
    handleCloseOvertimeModal();
    if (onOvertimeRegistered) onOvertimeRegistered();
  };

  if (showCalendar) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5" 
        onClick={handleCloseCalendar}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative" 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="md:hidden absolute top-4 right-4 text-red-600 border-none rounded-full w-10 h-10 text-3xl cursor-pointer flex items-center justify-center leading-none hover:text-red-700 hover:bg-red-50 transition-colors z-[100]" 
            onClick={handleCloseCalendar}
          >
            ×
          </button>
          <VacationCalendar currentUser={username} />
        </div>
      </div>
    );
  }

  if (showOvertimeModal) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5" 
        onClick={handleCloseOvertimeModal}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative" 
          onClick={(e) => e.stopPropagation()}
        >
          <ManualOvertimeButton username={username} onOvertimeRegistered={handleOvertimeRegistered} isOpen={true} onClose={handleCloseOvertimeModal} />
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bg-white border border-gray-300 rounded shadow-lg min-w-[200px] py-1 z-[1000]"
      style={{
        top: `${y}px`,
        left: `${x}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cursor-pointer select-none transition-colors hover:bg-gray-100">
        <span 
          className="py-2.5 px-4 flex items-center gap-2 text-sm text-gray-800"
          onClick={handleOpenOvertimeModal}
        >
          📊 Horas Extras Manuais
        </span>
      </div>
      <div className="cursor-pointer select-none transition-colors hover:bg-gray-100">
        <span 
          className="py-2.5 px-4 flex items-center gap-2 text-sm text-gray-800"
          onClick={handleOpenCalendar}
        >
          📅 Calendário de Férias
        </span>
      </div>
      {isAdmin && (
        <div className="cursor-pointer select-none transition-colors hover:bg-gray-100 [&_button]:w-full [&_button]:py-2.5 [&_button]:px-4 [&_button]:flex [&_button]:items-center [&_button]:gap-2 [&_button]:text-sm [&_button]:text-gray-800 [&_button]:text-left [&_button]:bg-transparent [&_button]:border-none [&_button]:cursor-pointer">
          <VacationButton username={username} date={date} onSuccess={onClose} />
        </div>
      )}
      <div className="cursor-pointer select-none transition-colors hover:bg-gray-100 [&_button]:w-full [&_button]:py-2.5 [&_button]:px-4 [&_button]:flex [&_button]:items-center [&_button]:gap-2 [&_button]:text-sm [&_button]:text-gray-800 [&_button]:text-left [&_button]:bg-transparent [&_button]:border-none [&_button]:cursor-pointer">
        <MedicalLeave username={username} date={date} onSuccess={onClose} />
      </div>
    </div>
  );
};

export default ContextMenu;