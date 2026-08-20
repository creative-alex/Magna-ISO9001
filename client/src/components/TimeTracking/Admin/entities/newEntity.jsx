import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../../utils/apiFetch';
import capa from '../../../../assets/timeTracking/capa.jpg';
import LogoutButton from '../../../Auth/logout';
import AdminNavigationButtons from '../../../../pages/TimeTracking/AdminDashboard';


const NovaEntidade = () => {
  const [nome, setNome] = useState('');
  const [morada, setMorada] = useState('');
  const [nif, setNif] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const novaEntidade = {
      nome,
      morada,
      nif: Number(nif),
    };

    try {
      const response = await apiFetch(`/entities/createEntity`, {
        method: 'POST',
        body: JSON.stringify(novaEntidade),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar entidade');
      }

      const data = await response.json();

      // ✅ Notificação de Sucesso
      toast.success('Entidade criada com sucesso!', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });

      // Limpa os campos
      setNome('');
      setMorada('');
      setNif('');
    } catch (error) {
      console.error('Erro ao enviar requisição:', error);

      // ❌ Notificação de Erro
      toast.error(`Erro: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
    }
  };

  return (
    <>
     <div className="w-[15vw] h-screen overflow-hidden max-[600px]:h-[120vh]">
              <img src={capa} alt="Capa" className="absolute top-0 left-0 z-[-1] w-[15vw] h-screen max-w-[30%] max-[900px]:max-w-none object-cover bg-[#f7e5c2] shadow transition-all duration-300 overflow-hidden max-[600px]:h-[120vh]" />
      </div>
      <LogoutButton />
       <div className="flex absolute top-[15px] left-[20%] gap-[5px] max-[600px]:w-[70vw]">
                <AdminNavigationButtons variant="entity-management" />
            </div>
    <div className="w-full max-w-[50vw] mx-auto p-8 bg-white rounded-lg absolute top-[10%] left-[20%] border-[1.5px] border-gold bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md">
      <h2 className="text-2xl font-bold text-gold">Criação de Nova Entidade</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label htmlFor="nome">Nome:</label>
          <input
            id="nome"
            type="text"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="morada">Morada:</label>
          <input
            id="morada"
            type="text"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={morada}
            onChange={(e) => setMorada(e.target.value)}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="nif">NIF:</label>
          <input
            id="nif"
            type="text"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={nif}
            minLength={9}
            maxLength={9}
            onChange={(e) => setNif(e.target.value)}
            required
          />
        </div>

        <button className="w-[65px] h-[65px] rounded-full bg-gold text-white text-2xl flex items-center justify-center cursor-pointer shadow transition-colors duration-300 ml-auto border-none" type="submit">→</button>
      </form>

      <ToastContainer />
    </div>
    </>
  );
};

export default NovaEntidade;

