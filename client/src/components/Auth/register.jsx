import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import Sidebar from '../Sidebar';
import Topbar from '../Topbar';
import { FaEye, FaEyeSlash, FaCircleExclamation } from "react-icons/fa6";

const Register = () => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setLoading(true);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Por favor, insira um e-mail válido.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error('A password deve ter pelo menos 6 caracteres.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('https://api-iso-9001.onrender.com/users/createUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome,
                    email,
                    temporaryPassword: password,
                    role: 'User',
                    isFirstLogin: true,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar utilizador');
            }

            toast.success('Conta criada com sucesso!');
            setNome('');
            setEmail('');
            setPassword('');

            setTimeout(() => navigate('/file'), 2000);
        } catch (error) {
            let errorMessage = 'Erro ao criar conta';
            if (error.message.includes('email-already-exists') || error.message.includes('Email já está em uso')) {
                errorMessage = 'Este e-mail já está em uso';
            } else if (error.message) {
                errorMessage = error.message;
            }
            setMessage(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = password.length === 0 ? null
        : password.length < 6 ? 'fraca'
        : password.length < 10 ? 'média'
        : 'forte';

    const strengthColor = { fraca: '#dc2626', média: '#d97706', forte: '#16a34a' };
    const strengthWidth = { fraca: '33%', média: '66%', forte: '100%' };

    return (
        <div className="flex min-h-screen">
            <Sidebar onSelectFile={(path) => navigate(`/file/${path.replace(/\s/g, '-').replace(/\//g, '__')}`)} />

            <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
                <Topbar icon="👤" title="Criar Nova Conta" />

                <div className="p-6 flex-1">
                    <div style={{ maxWidth: 540, margin: '0 auto' }}>

                        <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
                            <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Dados da Nova Conta</p>

                            {message && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] mb-5">
                                    <FaCircleExclamation size={15} style={{ flexShrink: 0 }} />
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="reg-nome" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Nome Completo</label>
                                    <input
                                        id="reg-nome"
                                        type="text"
                                        className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Nome completo do utilizador"
                                        autoComplete="name"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="reg-email" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Email</label>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="utilizador@email.com"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="reg-password" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Password Temporária</label>
                                    <div className="relative">
                                        <input
                                            id="reg-password"
                                            type={showPassword ? "text" : "password"}
                                            className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                            style={{ paddingRight: 44 }}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            autoComplete="new-password"
                                            minLength={6}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-[13px] top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 rounded-md text-gray-400 flex items-center justify-center hover:text-[#C8932F]"
                                            onClick={() => setShowPassword(p => !p)}
                                            aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                                        >
                                            {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                        </button>
                                    </div>

                                    {passwordStrength && (
                                        <div style={{ marginTop: 6 }}>
                                            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: strengthWidth[passwordStrength],
                                                    background: strengthColor[passwordStrength],
                                                    borderRadius: 4,
                                                    transition: 'width 0.3s, background 0.3s'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: strengthColor[passwordStrength], fontWeight: 600, marginTop: 3, display: 'block' }}>
                                                Força: {passwordStrength}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-[12px] text-gray-400">O utilizador será obrigado a alterar a password no primeiro acesso.</span>
                                </div>

                                <div className="flex gap-3 justify-end py-1 pb-2 max-sm:flex-col-reverse" style={{ marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="px-6 py-[11px] bg-white text-gray-500 border-[1.5px] border-gray-200 rounded-lg text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 max-sm:w-full max-sm:justify-center"
                                        onClick={() => navigate('/file')}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-7 py-[11px] bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-lg text-[14px] font-bold cursor-pointer tracking-[0.4px] flex items-center gap-2 shadow-[0_3px_12px_rgba(200,147,47,0.28)] transition-all duration-200 hover:enabled:opacity-[.92] hover:enabled:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none max-sm:w-full max-sm:justify-center"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? <><span className="inline-block w-[15px] h-[15px] border-2 border-white/35 border-t-white rounded-full animate-spin" /> A criar...</>
                                            : 'Criar Conta'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5" style={{ background: '#fffbf0', borderColor: '#e8d0a0' }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#7a5010', lineHeight: 1.7 }}>
                                <strong>Nota:</strong> A conta é criada com a password temporária definida acima.
                                O utilizador terá de alterar a password no primeiro login antes de aceder ao sistema.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
