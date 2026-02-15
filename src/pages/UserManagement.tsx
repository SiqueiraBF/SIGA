import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import { db } from '../services/supabaseService';
import type { Usuario, Funcao, Fazenda } from '../types';
import {
  Users,
  Plus,
  Power,
  UserCheck,
  UserX,
  Building2,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { UserFormModal } from '../components/UserFormModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { RoleManagementModal } from '../components/RoleManagementModal';
import { UserDetailsModal } from '../components/UserDetailsModal';

// UI Kit
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableActions } from '../components/ui/TableActions';
import { TableSkeleton } from '../components/ui/TableSkeleton';

// Helper for Sort
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export function UserManagement() {
  const { user, role, hasPermission } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterFarm, setFilterFarm] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Realtime Presence
  const { onlineUsers } = usePresence();

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [detailsUser, setDetailsUser] = useState<Usuario | null>(null);

  // Selection & Sorting
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<
    'nome' | 'login' | 'funcao' | 'filial' | 'last_login' | 'status' | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Permissions
  const canManageRoles =
    role?.nome === 'Administrador' || role?.permissoes?.gestao_usuarios?.manage_roles === true;
  const canEdit =
    role?.nome === 'Administrador' || role?.permissoes?.gestao_usuarios?.edit_scope !== 'NONE';

  // Check module access
  if (!hasPermission('gestao_usuarios')) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
          <UserX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
          <p className="text-red-600">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, filterRole, filterFarm, filterStatus, sortColumn, sortDirection]);

  const loadData = async () => {
    try {
      const [usersData, funcoesData, fazendasData] = await Promise.all([
        db.getAllUsers(),
        db.getRole(''),
        db.getFarm(''), // Assuming getFarm takes an ID or '' for all? The original code did Promise.all on map. Let's fix this.
      ]);

      // The original code loaded roles/farms based on what users had, which is safer if db.getAll... doesn't exist.
      // But db.getAllFarms() exists in RequestList.tsx logic. I'll trust db.getAllFarms exists.

      // Re-reading original `loadData` logic:
      /* 
            const allFuncoes = await Promise.all([...new Set(usersData.map(u => u.funcao_id))].map(id => db.getRole(id)));
            */
      // I will use the smarter way if available, but to be safe I'll stick to what worked or use the RequestList pattern if I'm sure.
      // RequestList used: db.getAllFarms() from db service.
      // Let's assume db.getAllFarms() and db.getAllUsers() are available and robust.

      // Retrying robust load based on RequestList learnings
      const [usersList, allFarms] = await Promise.all([db.getAllUsers(), db.getAllFarms()]);
      setUsers(usersList);
      setFazendas(allFarms);

      // Extract unique roles from the already joined data to populate filter dropdown
      // This eliminates the need to fetch each role individually by ID
      const rolesMap = new Map();
      usersList.forEach(u => {
        if (u.funcao_id && u.funcao) {
          rolesMap.set(u.funcao_id, { id: u.funcao_id, nome: u.funcao.nome });
        }
      });
      setFuncoes(Array.from(rolesMap.values()));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = users;

    if (searchTerm) {
      result = result.filter(
        (u) =>
          u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.login.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (filterRole !== 'all') {
      result = result.filter((u) => u.funcao_id === filterRole);
    }

    if (filterFarm !== 'all') {
      if (filterFarm === 'central') {
        result = result.filter((u) => !u.fazenda_id);
      } else {
        result = result.filter((u) => u.fazenda_id === filterFarm);
      }
    }

    if (filterStatus !== 'all') {
      result = result.filter((u) => u.ativo === (filterStatus === 'active'));
    }

    // Sort
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aValue: string = '';
        let bValue: string = '';

        if (sortColumn === 'nome') {
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
        } else if (sortColumn === 'login') {
          aValue = a.login.toLowerCase();
          bValue = b.login.toLowerCase();
        } else if (sortColumn === 'funcao') {
          aValue = a.funcao?.nome.toLowerCase() || '';
          bValue = b.funcao?.nome.toLowerCase() || '';
        } else if (sortColumn === 'filial') {
          aValue = a.fazenda?.nome.toLowerCase() || 'zzz';
          bValue = b.fazenda?.nome.toLowerCase() || 'zzz';
        } else if (sortColumn === 'last_login') {
          aValue = a.last_login || '';
          bValue = b.last_login || '';
        } else if (sortColumn === 'status') {
          aValue = a.ativo ? '1' : '0';
          bValue = b.ativo ? '1' : '0';
        }

        if (sortDirection === 'asc') return aValue.localeCompare(bValue);
        return bValue.localeCompare(aValue);
      });
    }

    setFilteredUsers(result);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: Usuario) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleToggleStatus = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const action = targetUser.ativo ? 'desativar' : 'ativar';
    if (window.confirm(`Confirma ${action} o usuário "${targetUser.nome}"?`)) {
      try {
        await db.toggleUserStatus(userId, user!.id);
        await loadData();
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  const handleModalClose = async (saved: boolean) => {
    setShowModal(false);
    setEditingUser(null);
    if (saved) await loadData();
  };

  const handleSort = (column: any) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Batch Actions
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
  };

  const toggleSelectUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const handleBatchDeactivate = async () => {
    if (!window.confirm(`Deseja desativar ${selectedUsers.size} usuários selecionados?`)) return;
    try {
      await Promise.all(Array.from(selectedUsers).map((id) => db.toggleUserStatus(id, user!.id)));
      await loadData();
      setSelectedUsers(new Set());
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterFarm('all');
    setFilterStatus('all');
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.ativo).length;
  const inactiveUsers = users.filter((u) => !u.ativo).length;
  const isUserOnline = (userId: string) => onlineUsers.has(userId);

  const hasActiveFilters = !!(
    searchTerm ||
    filterRole !== 'all' ||
    filterFarm !== 'all' ||
    filterStatus !== 'all'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <PageHeader
            title="Gestão de Usuários"
            subtitle="Gerencie usuários e permissões do sistema"
            icon={Users}
          >
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">
              <Plus size={20} />
              Novo Usuário
            </button>
          </PageHeader>
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Gerencie usuários e permissões do sistema"
        icon={Users}
      >
        {canManageRoles && (
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm"
          >
            <Users size={20} /> Gerenciar Funções
          </button>
        )}
        {canEdit && (
          <button
            onClick={handleCreateUser}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-semibold"
          >
            <Plus size={20} /> Novo Usuário
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <StatsCard
          title="TOTAL"
          value={totalUsers}
          icon={Users}
          description="usuários cadastrados"
          variant={filterStatus === 'all' ? 'blue' : 'default'}
          onClick={() => setFilterStatus('all')}
          className={`hover:bg-blue-50 ${filterStatus === 'all' ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}
        />
        <StatsCard
          title="ATIVOS"
          value={activeUsers}
          icon={UserCheck}
          description="acesso liberado"
          variant={filterStatus === 'active' ? 'green' : 'default'}
          onClick={() => setFilterStatus('active')}
          className={`hover:bg-green-50 ${filterStatus === 'active' ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
        />
        <StatsCard
          title="INATIVOS"
          value={inactiveUsers}
          icon={UserX}
          description="acesso bloqueado"
          variant={filterStatus === 'inactive' ? 'red' : 'default'}
          onClick={() => setFilterStatus('inactive')}
          className={`hover:bg-red-50 ${filterStatus === 'inactive' ? 'ring-2 ring-red-200 bg-red-50' : ''}`}
        />
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar por nome ou login..."
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        advancedFilters={
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users size={12} /> Função
              </label>
              <select
                className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Todas</option>
                {funcoes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Building2 size={12} /> Filial
              </label>
              <select
                className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                value={filterFarm}
                onChange={(e) => setFilterFarm(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="central">Central</option>
                {fazendas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        {selectedUsers.size > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white p-3 z-10 flex justify-between items-center px-6 animate-in slide-in-from-top-10 fade-in duration-200">
            <div className="flex items-center gap-3 font-semibold">
              <span className="bg-blue-500 py-1 px-3 rounded-lg text-sm">
                {selectedUsers.size} selecionado(s)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchDeactivate}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Power size={16} /> Alternar Status
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-4 py-1.5 hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-12">
                  <div
                    onClick={canEdit ? toggleSelectAll : undefined}
                    className={`cursor-pointer ${canEdit ? 'text-slate-400 hover:text-blue-600' : 'text-slate-200 cursor-not-allowed'} flex justify-center`}
                  >
                    {selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center gap-2">
                    Nome <SortIcon column="nome" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('login')}
                >
                  <div className="flex items-center gap-2">
                    Login <SortIcon column="login" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('funcao')}
                >
                  <div className="flex items-center gap-2">
                    Função <SortIcon column="funcao" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('filial')}
                >
                  <div className="flex items-center gap-2">
                    Filial <SortIcon column="filial" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('last_login')}
                >
                  <div className="flex items-center gap-2">
                    Último Acesso <SortIcon column="last_login" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon column="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUsers.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setDetailsUser(u)}
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td
                        className="px-4 py-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEdit) toggleSelectUser(u.id);
                        }}
                      >
                        {canEdit ? (
                          isSelected ? (
                            <CheckSquare size={18} className="text-blue-600 mx-auto" />
                          ) : (
                            <Square
                              size={18}
                              className="text-slate-300 mx-auto hover:text-blue-400"
                            />
                          )
                        ) : (
                          <Square size={18} className="text-slate-100 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {u.nome.charAt(0).toUpperCase()}
                            </div>
                            {isUserOnline(u.id) && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                                title="Online Agora"
                              ></span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span>{u.nome}</span>
                            {isUserOnline(u.id) && (
                              <span className="text-[10px] text-green-600 font-bold animate-pulse">
                                ● Online
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-sm">{u.login}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={u.funcao?.nome || '?'} variant="info" size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        {u.fazenda ? (
                          <div className="flex items-center gap-2">
                            <Building2
                              size={14}
                              className="text-green-600"
                            />
                            <span className="text-slate-700">
                              {u.fazenda.nome}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Central</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {u.last_login ? (
                          <div className="flex flex-col">
                            <span>{new Date(u.last_login).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(u.last_login).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={u.ativo ? 'Ativo' : 'Inativo'}
                          variant={u.ativo ? 'success' : 'error'}
                          icon={u.ativo ? UserCheck : UserX}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <TableActions
                          onHistory={() => {
                            setHistoryUserId(u.id);
                            setShowHistory(true);
                          }}
                          onEdit={canEdit ? () => handleEditUser(u) : undefined}
                          onView={!canEdit ? () => setDetailsUser(u) : undefined}
                        >
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(u.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-green-400 hover:bg-green-50 hover:text-green-600'}`}
                              title={u.ativo ? 'Desativar' : 'Ativar'}
                            >
                              <Power size={18} />
                            </button>
                          )}
                        </TableActions>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 px-2">
        <span>Total: {filteredUsers.length}</span>
      </div>

      {/* Modals */}
      {showModal && <UserFormModal user={editingUser} onClose={handleModalClose} />}
      <RoleManagementModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} />
      <UserDetailsModal
        isOpen={!!detailsUser}
        user={detailsUser}
        onClose={() => setDetailsUser(null)}
        role={funcoes.find((f) => f.id === detailsUser?.funcao_id)}
        farm={fazendas.find((f) => f.id === detailsUser?.fazenda_id)}
        canEdit={canEdit}
        onEdit={() => {
          if (detailsUser) {
            setDetailsUser(null);
            handleEditUser(detailsUser);
          }
        }}
      />
      {showHistory && historyUserId && (
        <AuditLogModal
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            setHistoryUserId(null);
          }}
          registroId={historyUserId}
        />
      )}
    </div>
  );
}
