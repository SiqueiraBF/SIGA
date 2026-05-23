import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Home,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Building2,
  Lock,
  Fuel,
  Package,
  Warehouse,
  FileSpreadsheet,
  Droplet,
  ShieldCheck,
  Sparkles,
  Gauge,
  Truck,
  Menu,
  X,
  Receipt,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import clsx from 'clsx';
import type { Modulo } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  modules: Modulo[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  if (!user || !role) return null;

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          label: 'Início',
          icon: <Home size={20} />,
          path: '/',
          modules: [],
        },
        {
          label: 'Solicitações de Cadastro',
          icon: <LayoutDashboard size={20} />,
          path: '/solicitacoes',
          modules: ['abrir_solicitacao'],
        },
      ],
    },
    {
      title: 'Logística e Estoque',
      items: [
        {
          label: 'Solicitações PCM',
          icon: <ClipboardList size={20} />,
          path: '/pcm-solicitacoes',
          modules: ['solicitacoes_pcm'],
        },
        {
          label: 'Saving de Compras',
          icon: <DollarSign size={20} />,
          path: '/savings',
          modules: ['controle_saving'],
        },
        {
          label: 'Transferência de Estoque',
          icon: <Package size={20} />,
          path: '/estoque/solicitacoes',
          modules: ['gestao_transferencias'],
        },
        {
          label: 'Gestão de Estoque',
          icon: <FileSpreadsheet size={20} />,
          path: '/estoque/importar',
          modules: ['gestao_estoque'],
        },
        {
          label: 'Estoque PU',
          icon: <Package size={20} />,
          path: '/estoque/usados',
          modules: ['gestao_estoque'],
        },
        {
          label: 'Controle de Exp. e Recebimento',
          icon: <Package size={20} />,
          path: '/recebimento',
          modules: ['gestao_recebimento'],
        },
      ],
    },
    {
      title: 'Fiscal e Recebimento',
      items: [
        {
          label: 'Pendencias de Entrada',
          icon: <ClipboardList size={20} />,
          path: '/nfs/dashboard',
          modules: ['gestao_nfs'],
        },
        {
          label: 'Fuga Processo',
          icon: <Receipt size={20} />,
          path: '/recebimento-direto',
          modules: ['gestao_recebimento_direto'],
        },
        {
          label: 'Pagamentos Fora do Prazo',
          icon: <AlertCircle size={20} />,
          path: '/pagamentos-atrasados',
          modules: ['pagamentos_fora_prazo'],
        },
        {
          label: 'Registro de Pagamentos (Atrasos)',
          icon: <TrendingDown size={20} />,
          path: '/registro-pagamentos-atraso',
          modules: ['pagamentos_fora_prazo'], // Por agora o mesmo perfil de acesso
        },
      ],
    },
    {
      title: 'Operacional e Postos',
      items: [
        {
          label: 'Gestão de Postos',
          icon: <Warehouse size={20} />,
          path: '/postos',
          modules: ['gestao_postos'],
        },
        {
          label: 'Drenagem de Postos',
          icon: <Droplet size={20} />,
          path: '/drenagem',
          modules: ['gestao_drenagem'],
        },
        {
          label: 'Baixas de Combustível',
          icon: <Fuel size={20} />,
          path: '/abastecimentos',
          modules: ['gestao_combustivel', 'abast_lancar', 'abast_conferir'],
        },
        {
          label: 'Auditoria de Recebimento',
          icon: <ShieldCheck size={20} />,
          path: '/auditoria-recebimento',
          modules: ['gestao_auditoria'],
        },
        {
          label: 'Auditoria de Abastecimentos',
          icon: <Gauge size={20} />,
          path: '/auditoria-medicoes',
          modules: ['gestao_auditoria'],
        },
        {
          label: 'Limpeza e Organização',
          icon: <Sparkles size={20} />,
          path: '/limpeza',
          modules: ['gestao_limpeza'],
        },
      ],
    },
    {
      title: 'Configurações',
      items: [
        {
          label: 'Gestão de Usuários',
          icon: <Users size={20} />,
          path: '/usuarios',
          modules: ['gestao_usuarios'],
        },
        {
          label: 'Gestão de Filiais',
          icon: <Building2 size={20} />,
          path: '/filiais',
          modules: ['config_fazendas'],
        },
        {
          label: 'Fornecedores',
          icon: <Truck size={20} />,
          path: '/fornecedores',
          modules: ['sys_admin', 'gestao_recebimento', 'gestao_recebimento_direto'], 
        },
      ],
    },
  ];

  const filterItems = (items: MenuItem[]) =>
    items.filter(
      (item) =>
        role.nome === 'Administrador' ||
        item.modules.length === 0 ||
        item.modules.some((m) => role.modulos_permitidos.includes(m)),
    );

  // Auto-expand section on mount if active item is inside
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      if (section.title) {
        const hasActiveItem = section.items.some((item) => {
          if (item.path === '/') return location.pathname === '/';
          return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        });
        if (hasActiveItem) {
          newExpanded[section.title] = true;
        }
      }
    });
    setExpandedSections((prev) => ({ ...prev, ...newExpanded }));
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={clsx(
          "fixed inset-0 bg-slate-900/50 z-40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div
        className={clsx(
          "flex flex-col h-screen w-64 bg-slate-900 text-white shadow-xl transition-transform duration-300 z-50 fixed md:relative",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="w-full max-w-[180px]">
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
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 mx-2 mt-2 mb-4 bg-slate-800/40 border border-white/5 rounded-2xl backdrop-blur-sm">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 px-1">Usuário Logado</div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                {user.nome.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" title="Online"></span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate leading-tight">{user.nome}</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                {role.nome}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-4 overflow-y-auto custom-scrollbar pb-6">
          {menuSections.map((section, idx) => {
            const allowedItems = filterItems(section.items);
            if (allowedItems.length === 0) return null;

            const isExpanded = !section.title || expandedSections[section.title];

            return (
              <div key={idx} className="space-y-1">
                {section.title && (
                  <button
                    onClick={() => toggleSection(section.title!)}
                    className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-slate-700 rounded-full group-hover:bg-blue-500 transition-colors"></div>
                      {section.title}
                    </span>
                    <div className={clsx(
                      "transition-transform duration-300",
                      isExpanded ? "rotate-180" : "rotate-0"
                    )}>
                      <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400" />
                    </div>
                  </button>
                )}
                
                <div className={clsx(
                  "space-y-1 transition-all duration-500 ease-in-out overflow-hidden",
                  isExpanded ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"
                )}>
                  {allowedItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 group relative overflow-hidden',
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1',
                        )
                      }
                    >
                      {/* Active Indicator Light */}
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 opacity-0 group-[.active]:opacity-100 transition-opacity" />
                      
                      <span className={clsx(
                        "transition-all duration-300 group-hover:scale-110",
                        "text-current"
                      )}>
                        {item.icon}
                      </span>
                      <span className="relative z-10">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/5 space-y-1">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all text-sm font-semibold group"
          >
            <Lock size={18} className="group-hover:rotate-12 transition-transform" />
            Alterar Senha
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all text-sm font-semibold group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            Sair do Sistema
          </button>
        </div>
      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  );
}
