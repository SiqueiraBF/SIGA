import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

const loginSchema = z.object({
  login: z.string().min(1, 'Login é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  
  // Lockout State
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const checkCapsLock = (e: React.KeyboardEvent) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  // Check Lockout on Mount and on Change
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const loginValue = window.localStorage.getItem('siga_login_last_attempt') || '';
    
    // We'll use a polling mechanism to check if the current typed user is locked out
    // Since the lockout logic is inside AuthContext based on the username, 
    // the AuthContext throws the error and we catch it here. 
    // But if we want real-time UI disabling, we can check the error message or localStorage here.
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const success = await login(data.login, data.senha);
      if (success) {
        navigate('/solicitacoes'); // Default redirect
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Erro ao autenticar. Tente novamente.';
      setError(errorMsg);
      
      // Se a mensagem contiver a palavra "bloqueada", nós entramos em modo de bloqueio UI
      if (errorMsg.includes('bloqueada')) {
         setIsLockedOut(true);
         // Extrai o tempo da mensagem caso queira (opcional, aqui usaremos estado simples pra desabilitar)
      }
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-300 font-sans antialiased overflow-hidden flex items-center justify-center relative"
      style={{
        backgroundColor: '#0B1120',
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}
    >
      {/* Background Ambient Lights */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-siga-green/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-siga-blue/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-siga-yellow/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[420px] px-6">
        
        {/* Login Card */}
        <div className="bg-[#1E293B]/70 backdrop-blur-[16px] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl p-8 sm:p-10 animate-slide-up">
            
            {/* Logo */}
            <div className="w-full flex justify-center mb-8 h-24">
                <div className="w-[280px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 90" width="100%" height="100%">
                    {/* ÍCONE DE ROTA DINÂMICA / SUPRIMENTOS */}
                    <g transform="translate(10, 18)">
                        {/* Seta de Sucesso / Agro / Crescimento (Superior) */}
                        <path d="M5 25 L20 10 L35 25" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Seta de Direção / Logística (Inferior) */}
                        <path d="M20 40 L35 25 L50 40" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                    {/* TIPOGRAFIA PRINCIPAL (SIGA) */}
                    <text x="80" y="48" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontStyle="italic" fontWeight="900" fontSize="44" fill="#ffffff" letterSpacing="1">SIGA</text>
                    
                    {/* PONTO AGRO / DETALHE DE CONEXÃO */}
                    <circle cx="202" cy="44" r="5.5" fill="#eab308"/>
                    
                    {/* SUBTÍTULO DO SISTEMA */}
                    <text x="82" y="68" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="9" fill="#94A3B8" letterSpacing="0.5">SISTEMA INTEGRADO DE GESTÃO DE ALMOXARIFADO</text>
                  </svg>
                </div>
            </div>

            {/* Header Text */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h1>
                <p className="text-sm text-slate-400">Acesse para gerenciar seus recursos</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {error && (
                  <div className="bg-red-900/50 text-red-200 px-4 py-3 rounded-xl text-sm border border-red-500/30 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {error}
                  </div>
                )}

                {capsLockActive && (
                  <div className="bg-amber-900/50 text-amber-200 px-4 py-2 rounded-xl text-xs border border-amber-500/30 flex items-center gap-2">
                    <span className="font-bold">⚠️ ATENÇÃO:</span> Caps Lock está ATIVADO.
                  </div>
                )}

                {/* Email */}
                <div className="group transition-all duration-300">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Usuário / E-mail</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-siga-blue transition-colors">
                            <User size={18} />
                        </div>
                        <input 
                            {...register('login')}
                            type="text" 
                            disabled={isLockedOut}
                            onKeyUp={checkCapsLock}
                            className="block w-full pl-12 pr-4 py-3.5 bg-[#0F172A] border border-slate-700/50 text-white rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-siga-blue/50 focus:border-siga-blue transition-all sm:text-sm shadow-inner disabled:opacity-50 disabled:cursor-not-allowed" 
                            placeholder="admin@empresa.com.br"
                        />
                    </div>
                    {errors.login && <p className="text-red-400 text-xs mt-1 ml-1">{errors.login.message}</p>}
                </div>

                {/* Password */}
                <div className="group transition-all duration-300">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Senha</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-siga-blue transition-colors">
                            <Lock size={18} />
                        </div>
                        <input 
                            {...register('senha')}
                            type={showPassword ? 'text' : 'password'} 
                            disabled={isLockedOut}
                            onKeyUp={checkCapsLock}
                            className="block w-full pl-12 pr-12 py-3.5 bg-[#0F172A] border border-slate-700/50 text-white rounded-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-siga-blue/50 focus:border-siga-blue transition-all sm:text-sm shadow-inner disabled:opacity-50 disabled:cursor-not-allowed" 
                            placeholder="••••••••"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            )}
                        </button>
                    </div>
                    {errors.senha && <p className="text-red-400 text-xs mt-1 ml-1">{errors.senha.message}</p>}
                </div>



                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={isSubmitting || isLockedOut}
                    className="w-full mt-4 flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-siga-blue/20 text-sm font-bold text-white bg-gradient-to-r from-siga-green to-siga-blue hover:from-green-500 hover:to-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-siga-blue focus:ring-offset-[#0B1120] transform transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:bg-slate-700 disabled:from-slate-700 disabled:to-slate-800"
                >
                    {isSubmitting ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <span>Acessar Sistema</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </>
                    )}
                </button>
            </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs text-slate-500">
                &copy; {new Date().getFullYear()} SIGA Gestão Integrada.<br/>Todos os direitos reservados.
            </p>
        </div>
      </div>
    </div>
  );
}
