import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  ClipboardList,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Building2,
  Lock,
  Fuel,
  Warehouse,
} from 'lucide-react';
import clsx from 'clsx';
import type { Modulo } from '../types';

export function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user || !role) return null;

  const menuItems: { label: string; icon: React.ReactNode; path: string; modules: Modulo[] }[] = [
    {
      label: 'Solicitações de Cadastro',
      icon: <LayoutDashboard size={20} />,
      path: '/solicitacoes',
      modules: ['abrir_solicitacao'],
    },
    {
      label: 'Análise de Cadastros',
      icon: <ClipboardList size={20} />,
      path: '/cadastros',
      modules: ['analisar_cadastros'],
    },
    {
      label: 'Postos de Abastecimento',
      icon: <Warehouse size={20} />,
      path: '/postos',
      modules: ['gestao_postos'],
    },
    {
      label: 'Baixas de Combustível',
      icon: <Fuel size={20} />,
      path: '/abastecimentos',
      modules: ['gestao_combustivel', 'abast_lancar', 'abast_conferir'],
    },
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

  ];

  const allowedItems = menuItems.filter(
    (item) =>
      role.nome === 'Administrador' ||
      item.modules.some((m) => role.modulos_permitidos.includes(m)),
  );

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 text-white shadow-xl transition-all duration-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="font-bold text-lg">G</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gravity</h1>
          <p className="text-xs text-slate-400">Unisystem Integration</p>
        </div>
      </div>

      <div className="p-4 border-b border-slate-800">
        <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Usuário</div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold">
            {user.nome.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user.nome}</p>
            <p className="text-xs text-slate-400 truncate">{role.nome}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs text-slate-500 uppercase font-semibold mb-2 ml-2">Menu</div>
        {allowedItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Lock size={20} />
          Alterar Senha
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          Sair do Sistema
        </button>
      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  );
}
