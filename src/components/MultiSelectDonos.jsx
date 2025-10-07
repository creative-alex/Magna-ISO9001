import React, { useState, useRef, useEffect } from 'react';
import './MultiSelectDonos.css';

const MultiSelectDonos = ({ 
  funcionarios = [], 
  donoProcesso = "", 
  setDonoProcesso, 
  isEditable = false, 
  isSuperAdmin = false,
  donoProcessoAlterado = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Converte a string de donos em array
  const donosArray = donoProcesso ? donoProcesso.split(',').map(nome => nome.trim()).filter(nome => nome) : [];

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle de seleção de funcionário
  const toggleFuncionario = (nomeFuncionario) => {
    if (!isEditable || !isSuperAdmin) return;

    let novosDonosArray;
    
    if (donosArray.includes(nomeFuncionario)) {
      // Remove o funcionário
      novosDonosArray = donosArray.filter(nome => nome !== nomeFuncionario);
    } else {
      // Adiciona o funcionário
      novosDonosArray = [...donosArray, nomeFuncionario];
    }

    // Converte de volta para string
    const novosDonosString = novosDonosArray.join(', ');
    setDonoProcesso(novosDonosString);
  };

  // Remove um dono específico
  const removeDono = (nomeDono, event) => {
    event.stopPropagation();
    if (!isEditable || !isSuperAdmin) return;

    const novosDonosArray = donosArray.filter(nome => nome !== nomeDono);
    const novosDonosString = novosDonosArray.join(', ');
    setDonoProcesso(novosDonosString);
  };

  const isDisabled = !isEditable || !isSuperAdmin;

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className={`multi-select-input ${donoProcessoAlterado ? 'altered' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
      >
        <div className="selected-donos">
          {donosArray.length === 0 ? (
            <span className="placeholder">Selecione os donos do processo...</span>
          ) : (
            donosArray.map((dono, index) => (
              <div key={index} className="dono-tag">
                <span>{dono}</span>
                {!isDisabled && (
                  <button 
                    className="remove-dono-btn"
                    onClick={(e) => removeDono(dono, e)}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {!isDisabled && (
          <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </div>
        )}
      </div>

      {isOpen && !isDisabled && (
        <div className="multi-select-dropdown">
          {funcionarios.length === 0 ? (
            <div className="dropdown-item disabled">Nenhum funcionário disponível</div>
          ) : (
            funcionarios.map((funcionario) => (
              <div
                key={funcionario.id}
                className={`dropdown-item ${donosArray.includes(funcionario.nome) ? 'selected' : ''}`}
                onClick={() => toggleFuncionario(funcionario.nome)}
              >
                <input
                  type="checkbox"
                  checked={donosArray.includes(funcionario.nome)}
                  onChange={() => {}} // Controlled by onClick
                  readOnly
                />
                <span>{funcionario.nome}</span>
              </div>
            ))
          )}
        </div>
      )}

      {donoProcessoAlterado && (
        <div className="alteration-badge">
          Alterado
        </div>
      )}
    </div>
  );
};

export default MultiSelectDonos;
