import React, { useContext, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiFetch } from '../../../../utils/apiFetch';
import { UserContext } from '../../../../context/userContext';
import capa from '../../../../assets/timeTracking/capa.jpg';
import LogoutButton from '../../../Auth/logout';
import AdminNavigationButtons from '../../../../pages/TimeTracking/AdminDashboard';

const NewUser = () => {
  const { nivelAcesso: actorNivelAcesso, entidadeNome: actorEntidadeNome } = useContext(UserContext);
  // Um Administrador só pode criar colaboradores dentro da sua própria entidade e
  // nunca pode atribuir um nível de acesso igual ou superior ao seu  -  o backend
  // também impõe isto, mas mantemos o formulário coerente com o que vai ser aceite.
  const isAdministrador = actorNivelAcesso === 'Administrador';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [entidade, setEntidade] = useState(isAdministrador ? (actorEntidadeNome || '') : '');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('Colaborador');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    // Validação do formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, insira um e-mail válido.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
      return;
    }

    // Inclui a senha temporária no objeto enviado ao backend
    const newUser = { nome, email, entidade, role, nivelAcesso, temporaryPassword: password };

    try {
      // Enviar requisição para criar o colaborador
      const response = await apiFetch(`/timetracking/createUser`, {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar user no banco de dados');
      }

      // Notificação de sucesso
      toast.success('User criado com sucesso!', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });

      // Limpar campos
      setNome('');
      setEmail('');
      setPassword('');
      setEntidade(isAdministrador ? (actorEntidadeNome || '') : '');
      setRole('');
      setNivelAcesso('Colaborador');
    } catch (error) {
      setMessage(`Erro: ${error.message}`);
      console.error('Erro ao processar a requisição:', error);

      // Notificação de erro
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
     <div className="flex absolute top-[15px] left-[20%] gap-[5px] max-[600px]:w-[70vw]">
            <AdminNavigationButtons variant="entity-management" />
        </div>
    <div style={{ width: '30vw' }}>
      <div className="w-[15vw] h-screen overflow-hidden max-[600px]:h-[120vh]">
          <img src={capa} alt="Capa" className="absolute top-0 left-0 z-[-1] w-[15vw] h-screen max-w-[30%] max-[900px]:max-w-none object-cover bg-[#f7e5c2] shadow transition-all duration-300 overflow-hidden max-[600px]:h-[120vh]" />
      </div>
          <LogoutButton />
      </div>
    <div className="w-full max-w-[50vw] mx-auto p-8 bg-white rounded-lg absolute top-[10%] left-[20%] border-[1.5px] border-gold bg-gradient-to-br from-gold/[0.08] to-gold/[0.03] transition-all duration-300 hover:shadow-md">
      <h2 className="text-2xl font-bold text-gold">Criação de Novo User</h2>
      {message && <p className="mb-4 text-gray-500">{message}</p>}
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
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="role">Função:</label>
          <input
            id="role"
            type="text"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none placeholder:text-gray-400 focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="nivelAcesso">Nível de acesso:</label>
          <select
            id="nivelAcesso"
            className="w-full border-0 border-b-2 border-[#d29b2f] bg-transparent py-2 px-1 text-base text-[#333] outline-none focus:border-b-2 focus:border-[#d29b2f] focus:outline-none"
            value={nivelAcesso}
            onChange={(e) => setNivelAcesso(e.target.value)}
            required
          >
            <option value="Colaborador">Colaborador</option>
            {!isAdministrador && <option value="Administrador">Administrador</option>}
            {!isAdministrador && <option value="GestorRH">Gestor(a) de Recursos Humanos</option>}
            {!isAdministrador && <option value="SuperAdmin">SuperAdmin</option>}
          </select>
        </div>

        <div className="mb-5">
          <label htmlFor="entidade">Entidade:</label>
          <input
            type="text"
            id="entidade"
            className="w-full h-[60px] px-[0.875rem] py-[0.625rem] border border-gold rounded-full text-[0.9375rem] bg-transparent text-[#1e293b] transition-all duration-300 focus:border-gold focus:shadow-[0_0_0_3px_rgba(200,147,47,0.2)] focus:outline-none placeholder:text-gray-400 max-[600px]:h-12 max-[600px]:text-base max-[600px]:px-3 max-[600px]:py-2 max-[600px]:bg-[#fffaf0] appearance-none cursor-pointer bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] pr-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%22%2364748b%22><path fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22 /></svg>')] disabled:cursor-not-allowed disabled:opacity-70"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            disabled={isAdministrador}
            required
          />
          {isAdministrador && (
            <span className="text-[12px] text-gray-400">Como Administrador, só podes criar colaboradores na tua própria entidade.</span>
          )}
          {/* <EntidadeSelect
            id="entidade"
            className="form-select"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            required
          /> */}
        </div>

        <button className="w-[65px] h-[65px] rounded-full bg-gold text-white text-2xl flex items-center justify-center cursor-pointer shadow transition-colors duration-300 ml-auto border-none" type="submit">→</button>
      </form>

      <ToastContainer />
    </div>
    </>
  );
};

export default NewUser;
