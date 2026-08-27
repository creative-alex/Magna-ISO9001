import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../shared/components/Sidebar';
import Topbar from '../../../shared/components/Topbar';
import { FaCircleExclamation } from 'react-icons/fa6';
import { apiFetch } from '../../../shared/utils/apiFetch';

const NovaEntidade = () => {
    const [nome, setNome] = useState('');
    const [morada, setMorada] = useState('');
    const [nif, setNif] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setLoading(true);

        try {
            const response = await apiFetch('/entities/createEntity', {
                method: 'POST',
                body: JSON.stringify({
                    nome,
                    morada,
                    nif: Number(nif),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar entidade');
            }

            toast.success('Entidade criada com sucesso!');
            setNome('');
            setMorada('');
            setNif('');

            setTimeout(() => navigate('/ponto/entidades'), 2000);
        } catch (error) {
            const errorMessage = error.message || 'Erro ao criar entidade';
            setMessage(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar onSelectFile={(path) => navigate(`/file/${path.replace(/\s/g, '-').replace(/\//g, '__')}`)} />

            <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
                <Topbar icon="🏢" title="Nova Entidade" />

                <div className="p-6 flex-1">
                    <div style={{ maxWidth: 540, margin: '0 auto' }}>

                        <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
                            <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Dados da Nova Entidade</p>

                            {message && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] mb-5">
                                    <FaCircleExclamation size={15} style={{ flexShrink: 0 }} />
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="ent-nome" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Nome</label>
                                    <input
                                        id="ent-nome"
                                        type="text"
                                        className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Nome da entidade"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="ent-morada" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Morada</label>
                                    <input
                                        id="ent-morada"
                                        type="text"
                                        className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                        value={morada}
                                        onChange={(e) => setMorada(e.target.value)}
                                        placeholder="Morada da entidade"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                                    <label htmlFor="ent-nif" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">NIF</label>
                                    <input
                                        id="ent-nif"
                                        type="text"
                                        className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                                        value={nif}
                                        onChange={(e) => setNif(e.target.value)}
                                        placeholder="Número de identificação fiscal"
                                        minLength={9}
                                        maxLength={9}
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 justify-end py-1 pb-2 max-sm:flex-col-reverse" style={{ marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="px-6 py-[11px] bg-white text-gray-500 border-[1.5px] border-gray-200 rounded-lg text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 max-sm:w-full max-sm:justify-center"
                                        onClick={() => navigate('/ponto/entidades')}
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
                                            : 'Criar Entidade'}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NovaEntidade;
