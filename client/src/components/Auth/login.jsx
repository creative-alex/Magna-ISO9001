import React, { useState, useContext, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../context/userContext";
import Logo from "../../logo.svg";
import LoginBackground from "../../assets/login/capa.jpg";
import LoginFooter from "../../assets/login/footer.png";
import LoginLogo from "../../assets/login/logo.png";
import { FaEye, FaEyeSlash, FaCircleExclamation } from "react-icons/fa6";

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [destination, setDestination] = useState("/dashboard");
    const navigate = useNavigate();
    const location = useLocation();
    const { auth, isAuthenticated, setUserEmail } = useContext(UserContext);
    const hasShownToast = useRef(false);
    const isLoginInProgress = useRef(false);

    const getFirebaseErrorMessage = (err) => {
        switch (err.code) {
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                return 'Email ou senha incorretos. Verifique os seus dados.';
            case 'auth/user-not-found':
                return 'Não existe uma conta associada a este email.';
            case 'auth/wrong-password':
                return 'Senha incorreta. Verifique a sua senha.';
            case 'auth/invalid-email':
                return 'O formato do email não é válido.';
            case 'auth/user-disabled':
                return 'Esta conta foi desactivada. Contacte o administrador.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas falhadas. Tente novamente mais tarde.';
            case 'auth/network-request-failed':
                return 'Erro de ligação. Verifique a sua internet.';
            default:
                return 'Erro ao fazer login. Verifique os seus dados.';
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            hasShownToast.current = false;
            isLoginInProgress.current = false;
            setEmail("");
            setPassword("");
            setError("");
            setLoading(false);
        }
    }, [isAuthenticated]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading || isLoginInProgress.current) return;

        isLoginInProgress.current = true;
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken(true);

            const response = await fetch("https://api-iso-9001.onrender.com/users/verifyTokenAndGetUserInfo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.isFirstLogin) {
                    navigate("/reset-password", { replace: true, state: { email: data.email } });
                    return;
                }

                if (!hasShownToast.current) {
                    hasShownToast.current = true;
                    toast.success("Login bem-sucedido!");
                }

                const target = location.state?.from?.pathname || destination;

                if (onLoginSuccess && typeof onLoginSuccess === 'function') {
                    onLoginSuccess(data, target);
                    return;
                }

                navigate(target, { replace: true });
            } else {
                setError(data.message || "Erro ao verificar token");
                toast.error("Erro ao verificar token");
                await auth.signOut();
            }
        } catch (err) {
            const msg = getFirebaseErrorMessage(err);
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
            isLoginInProgress.current = false;
        }
    };

    return (
        <div className="flex min-h-screen font-sans">
            <div className="fixed top-4 right-4 z-20">
                <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    aria-label="Entrar em"
                    className="bg-white text-[#5C3D0E] text-[11px] font-semibold rounded-md pl-2.5 pr-1.5 py-1.5 border border-gray-200 shadow-sm cursor-pointer transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C8932F]/50"
                >
                    <option value="/dashboard">Painel Principal</option>
                    <option value="/ponto">Livro de Ponto</option>
                </select>
            </div>
            {/* Brand panel */}
            <div className="w-[35%] min-w-[300px] flex flex-col items-center justify-center relative overflow-hidden px-10 py-12 before:content-[''] before:absolute before:-top-[100px] before:-right-[100px] before:w-[420px] before:h-[420px] before:rounded-full before:bg-white/[.06] before:pointer-events-none after:content-[''] after:absolute after:-bottom-[130px] after:-left-[80px] after:w-[400px] after:h-[400px] after:rounded-full after:bg-white/[.05] after:pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(145deg, rgba(74,28,0,0.45) 0%, rgba(122,64,16,0.4) 38%, rgba(200,147,47,0.35) 100%), url(${LoginBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}>
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

            {/* Form panel */}
            <div className="flex-1 flex flex-col overflow-y-auto relative px-8 py-6 bg-[#FDFCF9] max-sm:px-5 max-sm:py-5">
                <div className="flex-1 flex flex-col justify-center w-full max-w-[900px] mx-auto">
                    <div className="mb-6 max-sm:mb-6">
                        <img src={LoginLogo} alt="Logo Magna" className="block h-24 w-auto object-contain mb-5 -ml-8 max-sm:h-20 max-sm:mb-5 max-sm:-ml-4" />
                        <h2 className="text-[1.85rem] font-bold text-gray-900 m-0 mb-2 tracking-[-0.3px]">Bem-vindo/a</h2>
                        <p className="text-[14px] text-gray-500 m-0">Inicie sessão para aceder ao sistema</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
                        {/* Email field */}
                        <div className="flex flex-col gap-[7px]">
                            <label htmlFor="login-email" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.8px]">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="o.seu@email.com"
                                autoComplete="email"
                                required
                                className="h-[50px] px-4 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] text-gray-900 bg-white w-full box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] placeholder:text-[#c9d0d8]"
                            />
                        </div>

                        {/* Password field */}
                        <div className="flex flex-col gap-[7px]">
                            <div className="flex justify-between items-center">
                                <label htmlFor="login-password" className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.8px]">Senha</label>
                                <button
                                    type="button"
                                    className="bg-transparent border-0 p-0 text-xs text-[#C8932F] cursor-pointer font-medium underline underline-offset-2 transition-colors duration-150 hover:text-[#b8832a]"
                                    onClick={() => navigate("/forgot-password")}
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                    className="h-[50px] px-4 pr-[50px] border-[1.5px] border-gray-200 rounded-[10px] text-[15px] text-gray-900 bg-white w-full box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] placeholder:text-[#c9d0d8]"
                                />
                                <button
                                    type="button"
                                    className="absolute right-[13px] top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 rounded-md text-gray-400 flex items-center justify-center transition-colors duration-150 hover:text-[#C8932F] hover:bg-[#C8932F]/[.08]"
                                    onClick={() => setShowPassword(p => !p)}
                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-[9px] px-[14px] py-[11px] text-[13px] leading-[1.4]" role="alert">
                                <FaCircleExclamation size={15} style={{ flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="h-[52px] w-full bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-[10px] text-[14px] font-bold cursor-pointer tracking-[1.8px] uppercase mt-1 flex items-center justify-center shadow-[0_4px_18px_rgba(200,147,47,0.38)] transition-all duration-200 hover:enabled:opacity-[.92] hover:enabled:-translate-y-px active:enabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                            disabled={loading}
                        >
                            {loading ? <span className="inline-block w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-loginSpin" /> : "Entrar"}
                        </button>
                    </form>
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

export default Login;
