import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import Logo from "../../logo.svg";
import LoginBackground from "../../assets/login/capa.jpg";
import LoginFooter from "../../assets/login/footer.png";
import LoginLogo from "../../assets/login/logo.png";
import { APP_CONSTANTS } from "../../utils/constants";
import { FaEye, FaEyeSlash, FaCheck, FaXmark, FaUser } from "react-icons/fa6";
import { apiFetch } from "../../utils/apiFetch";

const FirstLoginComponent = ({ onComplete, mode = "firstLogin" }) => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetCode, setResetCode] = useState(null);
    const [isValidResetCode, setIsValidResetCode] = useState(false);
    const { userEmail, auth } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const emailToUse = location.state?.email || userEmail;

    const isResetMode = mode === "reset" || searchParams.get("mode") === "reset" || !!searchParams.get("oobCode");
    const isFirstLogin = !isResetMode;

    useEffect(() => {
        if (!isResetMode) return;
        const oobCode = searchParams.get("oobCode");
        if (!oobCode) {
            toast.error("Código de recuperação não encontrado.");
            setTimeout(() => navigate("/", { replace: true }), 3000);
            return;
        }
        setLoading(true);
        verifyPasswordResetCode(auth, oobCode)
            .then(() => { setResetCode(oobCode); setIsValidResetCode(true); })
            .catch((err) => {
                const msg = err.code === 'auth/expired-action-code'
                    ? "O link expirou. Solicite um novo."
                    : "O link de recuperação é inválido ou já foi usado.";
                toast.error(msg);
                setTimeout(() => navigate("/", { replace: true }), 3000);
            })
            .finally(() => setLoading(false));
    }, [isResetMode, searchParams, auth, navigate]);

    const minLen = APP_CONSTANTS.MIN_PASSWORD_LENGTH || 6;
    const isPasswordValid = newPassword.length >= minLen;
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const handleFirebasePasswordReset = async () => {
        if (loading || !resetCode) return;
        setLoading(true);
        try {
            if (!newPassword.trim()) throw new Error("Insira uma nova senha.");
            if (!isPasswordValid) throw new Error(`A senha deve ter pelo menos ${minLen} caracteres.`);
            if (!passwordsMatch) throw new Error("As senhas não coincidem.");
            await confirmPasswordReset(auth, resetCode, newPassword);
            toast.success("Senha alterada com sucesso!");
            setTimeout(() => navigate("/", { replace: true }), 2000);
        } catch (err) {
            const msg = err.code === 'auth/weak-password' ? "Senha demasiado fraca." : err.message;
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (loading) return;
        setLoading(true);
        try {
            if (!emailToUse) throw new Error("Erro: utilizador não encontrado.");
            if (!newPassword.trim()) throw new Error("Insira uma nova senha.");
            if (!isPasswordValid) throw new Error(`A senha deve ter pelo menos ${minLen} caracteres.`);
            if (!passwordsMatch) throw new Error("As senhas não coincidem.");

            const response = await apiFetch("/users/update-first-login", {
                method: "POST",
                body: JSON.stringify({ userEmail: emailToUse, newPassword, isFirstLogin: false }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro ao atualizar senha");

            toast.success("Senha definida com sucesso!");
            setTimeout(() => {
                if (onComplete) onComplete();
                else navigate("/", { replace: true });
            }, 2000);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isResetMode) handleFirebasePasswordReset();
        else handlePasswordChange();
    };

    const isFormReady = isFirstLogin
        ? isPasswordValid && passwordsMatch
        : isPasswordValid && passwordsMatch && isValidResetCode;

    const pageTitle    = "Definir Nova Senha";
    const pageSubtitle = "Crie uma nova senha pessoal para aceder ao sistema";

    return (
        <div className="flex min-h-screen font-sans">
            {/* Painel de marca — igual ao login */}
            <div
                className="w-[35%] min-w-[300px] flex flex-col items-center justify-center relative overflow-hidden px-10 py-12 before:content-[''] before:absolute before:-top-[100px] before:-right-[100px] before:w-[420px] before:h-[420px] before:rounded-full before:bg-white/[.06] before:pointer-events-none after:content-[''] after:absolute after:-bottom-[130px] after:-left-[80px] after:w-[400px] after:h-[400px] after:rounded-full after:bg-white/[.05] after:pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(145deg, rgba(74,28,0,0.45) 0%, rgba(122,64,16,0.4) 38%, rgba(200,147,47,0.35) 100%), url(${LoginBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="text-center relative z-[1]">
                    <div className="w-[90px] h-[90px] bg-white/[.18] border border-white/[.28] rounded-[22px] flex items-center justify-center mx-auto mb-7 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                        <img src={Logo} alt="Logo Magna" className="w-[54px] h-[54px] brightness-0 invert" />
                    </div>
                    <h1 className="text-[2.7rem] font-extrabold text-white m-0 tracking-[5px] uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">Magna</h1>
                    <p className="text-[0.88rem] text-white/90 mt-[7px] mb-[22px] tracking-[7px] uppercase font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">ISO&nbsp;9001</p>
                    <div className="w-[38px] h-[1.5px] bg-white/30 rounded-[2px] mx-auto mb-5" />
                    <p className="text-[0.85rem] text-white/90 m-0 font-medium leading-[1.8] tracking-[0.3px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                        Sistema de Gestão<br />de Qualidade
                    </p>
                </div>
                <span className="absolute bottom-[22px] text-[10.5px] text-white/75 tracking-[0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">© 2026 Magna · Qualidade &amp; Excelência</span>
            </div>

            {/* Painel do formulário */}
            <div className="flex-1 flex flex-col overflow-y-auto relative px-8 py-6 bg-[#FDFCF9] max-sm:px-5 max-sm:py-5">
                <div className="flex-1 flex flex-col justify-center w-full max-w-[900px] mx-auto">
                <div className="w-full max-w-[400px]">
                    <div className="mb-6 max-sm:mb-6">
                        <img src={LoginLogo} alt="Logo Magna" className="block h-24 w-auto object-contain mb-5 -ml-8 max-sm:h-20 max-sm:mb-5 max-sm:-ml-4" />
                        <h2 className="text-[1.85rem] font-bold text-gray-900 m-0 mb-2 tracking-[-0.3px]">{pageTitle}</h2>
                        <p className="text-[14px] text-gray-500 m-0">{pageSubtitle}</p>
                    </div>

                    {/* Estado de verificação do código (modo reset) */}
                    {isResetMode && !isValidResetCode ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            {loading ? (
                                <>
                                    <span className="inline-block border-[2.5px] border-white/30 border-t-white rounded-full animate-loginSpin" style={{ borderColor: 'rgba(200,147,47,0.3)', borderTopColor: '#C8932F', width: 32, height: 32, borderWidth: 3 }} />
                                    <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>A verificar o link de recuperação...</p>
                                </>
                            ) : (
                                <>
                                    <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 20 }}>Link inválido ou expirado.</p>
                                    <button
                                        className="h-[52px] bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-[10px] text-[14px] font-bold cursor-pointer tracking-[1.8px] uppercase flex items-center justify-center shadow-[0_4px_18px_rgba(200,147,47,0.38)] transition-all duration-200 hover:opacity-[.92] hover:-translate-y-px"
                                        onClick={() => navigate("/")}
                                        style={{ width: 'auto', padding: '0 32px' }}
                                    >
                                        Voltar ao Login
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <form className="flex flex-col gap-[22px]" onSubmit={handleSubmit}>
                            {/* Email info (primeiro acesso) */}
                            {isFirstLogin && emailToUse && (
                                <div className="bg-gold-light border border-gold-mid rounded-[10px] px-[14px] py-[10px] text-[13px] text-logo-text flex items-center gap-2 mb-1">
                                    <FaUser size={14} style={{ flexShrink: 0 }} />
                                    <span><strong>{emailToUse}</strong></span>
                                </div>
                            )}

                            {/* Nova senha */}
                            <div className="flex flex-col gap-[7px]">
                                <label htmlFor="fl-new" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.8px]">Nova Senha</label>
                                <div className="relative">
                                    <input
                                        id="fl-new"
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                        required
                                        className="h-[50px] px-4 pr-[50px] border-[1.5px] border-gray-200 rounded-[10px] text-[15px] text-gray-900 bg-white w-full box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] placeholder:text-[#c9d0d8]"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-[13px] top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 rounded-md text-gray-400 flex items-center justify-center transition-colors duration-150 hover:text-[#C8932F] hover:bg-[#C8932F]/[.08]"
                                        onClick={() => setShowNew(p => !p)}
                                        aria-label="Mostrar senha"
                                    >
                                        {showNew ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                    </button>
                                </div>

                                {/* Barra de força */}
                                {newPassword.length > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                        <div style={{ height: 3, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                borderRadius: 4,
                                                transition: 'width 0.3s, background 0.3s',
                                                width: newPassword.length < 6 ? '33%' : newPassword.length < 10 ? '66%' : '100%',
                                                background: newPassword.length < 6 ? '#dc2626' : newPassword.length < 10 ? '#d97706' : '#16a34a',
                                            }} />
                                        </div>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, marginTop: 3, display: 'block',
                                            color: newPassword.length < 6 ? '#dc2626' : newPassword.length < 10 ? '#d97706' : '#16a34a',
                                        }}>
                                            {newPassword.length < 6 ? 'Senha fraca' : newPassword.length < 10 ? 'Senha média' : 'Senha forte'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Confirmar senha */}
                            <div className="flex flex-col gap-[7px]">
                                <label htmlFor="fl-confirm" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.8px]">Confirmar Senha</label>
                                <div className="relative">
                                    <input
                                        id="fl-confirm"
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a nova senha"
                                        autoComplete="new-password"
                                        required
                                        className="h-[50px] px-4 pr-[50px] border-[1.5px] border-gray-200 rounded-[10px] text-[15px] text-gray-900 bg-white w-full box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] placeholder:text-[#c9d0d8]"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-[13px] top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 rounded-md text-gray-400 flex items-center justify-center transition-colors duration-150 hover:text-[#C8932F] hover:bg-[#C8932F]/[.08]"
                                        onClick={() => setShowConfirm(p => !p)}
                                        aria-label="Mostrar confirmação"
                                    >
                                        {showConfirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Indicadores de validação */}
                            {(newPassword || confirmPassword) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: isPasswordValid ? '#16a34a' : '#9ca3af' }}>
                                        <span style={{ color: isPasswordValid ? '#16a34a' : '#dc2626' }}>
                                            {isPasswordValid ? <FaCheck size={12} /> : <FaXmark size={12} />}
                                        </span>
                                        Mínimo {minLen} caracteres
                                    </div>
                                    {confirmPassword && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: passwordsMatch ? '#16a34a' : '#9ca3af' }}>
                                            <span style={{ color: passwordsMatch ? '#16a34a' : '#dc2626' }}>
                                                {passwordsMatch ? <FaCheck size={12} /> : <FaXmark size={12} />}
                                            </span>
                                            As senhas coincidem
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="h-[52px] w-full bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-[10px] text-[14px] font-bold cursor-pointer tracking-[1.8px] uppercase mt-1 flex items-center justify-center shadow-[0_4px_18px_rgba(200,147,47,0.38)] transition-all duration-200 hover:enabled:opacity-[.92] hover:enabled:-translate-y-px active:enabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                                disabled={loading || !isFormReady}
                            >
                                {loading ? <span className="inline-block w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-loginSpin" /> : 'Confirmar Nova Senha'}
                            </button>

                            <button
                                type="button"
                                className="bg-transparent border-0 p-0 text-[13px] text-[#C8932F] cursor-pointer font-medium underline underline-offset-2 transition-colors duration-150 hover:text-[#b8832a] block mx-auto mt-4"
                                onClick={() => navigate("/")}
                            >
                                Voltar ao Login
                            </button>
                        </form>
                    )}
                </div>
                </div>

                <img
                    src={LoginFooter}
                    alt=""
                    className="w-auto h-auto max-w-[700px] max-h-[240px] object-contain mx-auto mt-6 shrink-0 max-sm:max-w-[220px] max-sm:max-h-[55px] max-sm:mt-6"
                />
            </div>
        </div>
    );
};

export default FirstLoginComponent;
