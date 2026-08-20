import React from 'react';
import { Link } from 'react-router-dom';

// Botões de navegação embutidos nas páginas de criação de entidade/utilizador
const AdminNavigationButtons = () => (
  <div className="w-[45vw] absolute flex gap-[5px] top-[35%] left-[35%] text-gold z-[5] max-[900px]:top-[30%] max-[900px]:right-0 max-[900px]:mx-auto max-[900px]:mt-8 max-[900px]:grid max-[900px]:grid-rows-2 max-[900px]:grid-cols-2 max-[900px]:w-[80vw] max-[600px]:top-[20%] max-[600px]:left-[25%] max-[600px]:mx-auto max-[600px]:my-8 max-[600px]:w-[50vw]">
    <Link to="/ponto/entidades" className="row-span-1 col-span-2">
      <button className="text-[1.5vw] bg-transparent text-gold border-2 border-gold rounded-full h-[8vh] w-full cursor-pointer hover:bg-gold hover:text-white row-span-1 col-span-2 bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md">
        Voltar às Entidades
      </button>
    </Link>
    <Link to="/ponto/nova-entidade" className="row-start-2 row-span-1 col-start-2 col-span-1">
      <button className="text-[1.5vw] bg-transparent text-gold border-2 border-gold rounded-full h-[8vh] w-full cursor-pointer hover:bg-gold hover:text-white row-start-2 row-span-1 col-start-2 col-span-1 bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md">
        Nova Entidade
      </button>
    </Link>
    <Link to="/ponto/novo-user" className="row-start-2 row-span-1 col-start-1 col-span-1">
      <button className="text-[1.5vw] bg-transparent text-gold border-2 border-gold rounded-full h-[8vh] w-full cursor-pointer hover:bg-gold hover:text-white row-start-2 row-span-1 col-start-1 col-span-1 bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md">
        Novo Utilizador
      </button>
    </Link>
  </div>
);

export default AdminNavigationButtons;
