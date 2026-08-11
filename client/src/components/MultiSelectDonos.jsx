import React, { useState, useRef, useEffect } from 'react';

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
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`border rounded px-3 py-2 min-h-[40px] bg-white flex items-center justify-between transition-colors duration-200 ${donoProcessoAlterado ? 'border-green-500 bg-green-50/30' : 'border-[#ccc]'} ${isDisabled ? 'bg-[#f5f5f5] cursor-not-allowed border-[#ddd] hover:border-[#ddd]' : 'cursor-pointer hover:border-blue-500'}`}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1 items-center">
          {donosArray.length === 0 ? (
            <span className="text-[#999] italic">Selecione os donos do processo...</span>
          ) : (
            donosArray.map((dono, index) => (
              <div key={index} className="bg-blue-500 text-white px-2 py-0.5 rounded-xl text-xs flex items-center gap-1 max-w-[150px]">
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{dono}</span>
                {!isDisabled && (
                  <button
                    className="bg-transparent border-0 text-white cursor-pointer text-sm leading-[1] p-0 ml-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/20"
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
          <div className={`text-[#666] text-xs transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </div>
        )}
      </div>

      {isOpen && !isDisabled && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#ccc] border-t-0 rounded-b max-h-[200px] overflow-y-auto z-[1000] shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          {funcionarios.length === 0 ? (
            <div className="px-3 py-2 flex items-center gap-2 text-[#999] cursor-not-allowed">Nenhum funcionário disponível</div>
          ) : (
            funcionarios.map((funcionario) => (
              <div
                key={funcionario.id}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors duration-200 hover:bg-gray-50 ${donosArray.includes(funcionario.nome) ? 'bg-[#e3f2fd]' : ''}`}
                onClick={() => toggleFuncionario(funcionario.nome)}
              >
                <input
                  type="checkbox"
                  checked={donosArray.includes(funcionario.nome)}
                  onChange={() => {}} // Controlled by onClick
                  readOnly
                  className="m-0 cursor-pointer"
                />
                <span>{funcionario.nome}</span>
              </div>
            ))
          )}
        </div>
      )}

      {donoProcessoAlterado && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-[10px] whitespace-nowrap z-[1001]">
          Alterado
        </div>
      )}
    </div>
  );
};

export default MultiSelectDonos;
