import { Edit, User, Mail, Phone, Calendar, Building2, Shield } from 'lucide-react';
import type { Usuario, Funcao, Fazenda } from '../types';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';
import { StatusBadge } from './ui/StatusBadge';

interface UserDetailsModalProps {
  user: Usuario | null;
  role?: Funcao;
  farm?: Fazenda;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

export function UserDetailsModal({
  user,
  role,
  farm,
  isOpen,
  onClose,
  onEdit,
  canEdit,
}: UserDetailsModalProps) {
  if (!isOpen || !user) return null;

  const isOnline =
    user.last_seen && new Date().getTime() - new Date(user.last_seen).getTime() < 5 * 60 * 1000;
  const initials = user.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Standard Header */}
        <ModalHeader
          title="Detalhes do Usuário"
          subtitle={`@${user.login}`}
          icon={User}
          iconClassName="text-blue-600 bg-blue-50 border-blue-100"
          onClose={onClose}
        />

        {/* Body */}
        <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto">
          {/* User Identity Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-slate-100 text-blue-600 flex items-center justify-center text-2xl font-bold border-4 border-white shadow-sm">
                {initials}
              </div>
              {isOnline && (
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"
                  title="Online Agora"
                />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{user.nome}</h2>
              <p className="text-slate-500 font-mono text-sm mb-2">@{user.login}</p>
              <StatusBadge
                status={user.ativo ? 'Ativo' : 'Inativo'}
                variant={user.ativo ? 'success' : 'error'}
              />
            </div>
          </div>

          {/* Info Grid */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Função / Perfil
                  </p>
                  <p className="text-slate-800 font-medium">{role?.nome || 'Não definida'}</p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Filial / Fazenda
                  </p>
                  <p className="text-slate-800 font-medium">{farm?.nome || 'Central / Matriz'}</p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    E-mail
                  </p>
                  <p className="text-slate-800 font-medium break-all">
                    {user.email || 'Não informado'}
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="p-2.5 bg-green-50 text-green-600 rounded-xl shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Telefone
                  </p>
                  <p className="text-slate-800 font-medium">{user.telefone || 'Não informado'}</p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Último Acesso
                  </p>
                  <p className="text-slate-800 font-medium">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString('pt-BR')
                      : 'Nunca acessou'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <ModalFooter>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition-colors"
          >
            Fechar
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Edit size={18} /> Editar Usuário
            </button>
          )}
        </ModalFooter>
      </div>
    </div>
  );
}
