import { useState, useEffect } from 'react';
import { roleService } from '../services/supabaseService';
import type { Funcao, Modulo, ViewScope, EditScope, ModulePermission } from '../types';
import {
  Save,
  Shield,
  Check,
  Info,
  Plus,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  UserCog,
  Search,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { ModalHeader } from './ui/ModalHeader';

const CONFIGURABLE_MODULES: {
  key: Modulo;
  label: string;
  description: string;
  supportsConfirm?: boolean;
  confirmLabel?: string;
  confirmDescription?: string;
  simpleEdit?: boolean;
  supportsFleetManagement?: boolean;
  supportsRoleManagement?: boolean;
  supportsManualFueling?: boolean;
  supportsIgnoreNuntec?: boolean;
  supportsNotifications?: boolean;
}[] = [
    {
      key: 'gestao_combustivel',
      label: 'Baixas de Combustível',
      description: 'Controle de abastecimentos e estoque',
      supportsConfirm: true,
      confirmLabel: 'Confirmar Baixa',
      confirmDescription: 'Efetivar saída de estoque',
      supportsFleetManagement: true,
      supportsManualFueling: true,
      supportsIgnoreNuntec: true,
    },
    {
      key: 'gestao_postos',
      label: 'Gestão de Postos',
      description: 'Cadastros de reservatórios',
      supportsConfirm: false,
      simpleEdit: true,
    },
    {
      key: 'abrir_solicitacao',
      label: 'Solicitações de Cadastro',
      description: 'Abertura, acompanhamento e análise',
      supportsConfirm: true,
      confirmLabel: 'Aprovar / Analisar',
      confirmDescription: 'Acesso ao painel de análise',
    },
    {
      key: 'gestao_usuarios',
      label: 'Gestão de Usuários',
      description: 'Administração do sistema',
      supportsConfirm: false,
      simpleEdit: true,
      supportsRoleManagement: true,
    },
    {
      key: 'config_fazendas',
      label: 'Config. Fazendas',
      description: 'Cadastros de filiais',
      supportsConfirm: false,
      simpleEdit: true,
    },
    {
      key: 'gestao_recebimento',
      label: 'Central de Distribuição',
      description: 'Expedição e Recebimento de mercadorias',
      supportsConfirm: false,
      supportsNotifications: true,
    },
    {
      key: 'gestao_transferencias',
      label: 'Transferências de Estoque',
      description: 'Movimentações entre unidades/comboios',
      supportsConfirm: true,
      confirmLabel: 'Separar Transferência',
      confirmDescription: 'Permite gerenciar a separação de itens',
      supportsNotifications: true,
    },
    {
      key: 'gestao_limpeza',
      label: 'Limpeza e Organização',
      description: 'Manutenção e auditoria de limpeza',
      supportsConfirm: false,
      simpleEdit: true,
      supportsNotifications: true,
    },
    {
      key: 'gestao_drenagem',
      label: 'Drenagem de Postos',
      description: 'Drenagem e descarte',
      supportsConfirm: false,
      simpleEdit: true,
      supportsNotifications: true,
    },
    {
      key: 'gestao_auditoria',
      label: 'Auditorias Fiscais e Medições',
      description: 'Auditoria de notas e reconciliação (Acesso Restrito)',
      supportsConfirm: false,
      simpleEdit: true,
    },
    {
      key: 'gestao_estoque',
      label: 'Gestão de Estoque',
      description: 'Visualização e carga do estoque da Matriz',
      supportsConfirm: false,
      simpleEdit: true,
    },
    {
      key: 'gestao_nfs',
      label: 'Painel de NFs',
      description: 'Gestão de Notas Fiscais pendentes e conciliadas',
      supportsConfirm: false,
      simpleEdit: true,
      supportsNotifications: true,
    },
  ];

export function RoleManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [roles, setRoles] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Create Role State
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      setSelectedRoleId(null); // Reset selection on open
    }
  }, [isOpen]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await roleService.getAll();
      setRoles(data);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
      alert('Erro ao carregar funções.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    // Client-side unique check
    const exists = roles.some((r) => r.nome.toLowerCase() === newRoleName.trim().toLowerCase());
    if (exists) {
      alert('Erro: Já existe um perfil com este nome.');
      return;
    }

    setLoading(true);
    try {
      const newRole = await roleService.create({
        id: crypto.randomUUID(),
        nome: newRoleName,
        modulos_permitidos: [],
        permissoes: {},
      });
      setRoles([...roles, newRole]);
      setSelectedRoleId(newRole.id);
      setNewRoleName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      alert('Erro ao criar perfil. Verifique se o nome é único.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Module "Link" (Enable/Disable)
  const handleToggleModuleLink = (roleId: string, moduleKey: Modulo, isLinked: boolean) => {
    handlePermissionChange(roleId, moduleKey, 'view_scope', isLinked ? 'ALL' : 'NONE');
  };

  const handlePermissionChange = (
    roleId: string,
    moduleKey: Modulo,
    field: keyof ModulePermission,
    value: any,
  ) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;

        const safePerms = r.permissoes || {};
        const defaultCanConfirm =
          moduleKey === 'abrir_solicitacao'
            ? r.modulos_permitidos.includes('analisar_cadastros')
            : false;

        const currentPerm = safePerms[moduleKey] || {
          view_scope: r.modulos_permitidos.includes(moduleKey) ? 'ALL' : 'NONE',
          edit_scope: 'NONE',
          can_confirm: defaultCanConfirm,
        };

        const updatedPerm = { ...currentPerm, [field]: value };

        // Legacy Sync Strategy
        let newLegacyList = [...r.modulos_permitidos];

        // 1. Basic Module Presence (View Scope)
        if (field === 'view_scope') {
          if (value === 'NONE') {
            newLegacyList = newLegacyList.filter((m) => m !== moduleKey);
          } else {
            if (!newLegacyList.includes(moduleKey)) newLegacyList.push(moduleKey);
          }
        }

        // 2. Virtual Permissions Sync (e.g., 'analisar_cadastros' implied by 'abrir_solicitacao.can_confirm')
        if (moduleKey === 'abrir_solicitacao' && field === 'can_confirm') {
          if (value === true) {
            if (!newLegacyList.includes('analisar_cadastros'))
              newLegacyList.push('analisar_cadastros');
          } else {
            newLegacyList = newLegacyList.filter((m) => m !== 'analisar_cadastros');
          }
        }

        return {
          ...r,
          permissoes: {
            ...safePerms,
            [moduleKey]: updatedPerm,
          },
          modulos_permitidos: newLegacyList,
        };
      }),
    );
  };

  const handleSaveRole = async (role: Funcao) => {
    setSavingId(role.id);
    try {
      await roleService.update(role.id, {
        nome: role.nome,
        modulos_permitidos: role.modulos_permitidos,
        permissoes: role.permissoes,
      });
      alert('Permissões salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      alert(`Erro ao salvar permissões: ${(error as any)?.message || 'Erro desconhecido'}`);
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
        {/* Unified Header */}
        <ModalHeader
          title="Gestão de Perfis"
          subtitle="Defina os papéis e permissões de acesso do sistema."
          icon={Shield}
          onClose={onClose}
        />

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* SIDEBAR: Lista de Perfis */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && !roles.length ? (
                <div className="text-center py-10 text-slate-400 text-sm">Carregando...</div>
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${selectedRoleId === role.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'
                      }`}
                  >
                    <span className="font-semibold">{role.nome}</span>
                    <ChevronRight
                      size={18}
                      className={`transition-transform ${selectedRoleId === role.id ? 'text-white translate-x-1' : 'text-slate-300 group-hover:text-blue-400'}`}
                    />
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              {isCreating ? (
                <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
                  <input
                    autoFocus
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do Novo Perfil"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRole}
                      disabled={loading || !newRoleName}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      CRIAR
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-3 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                    >
                      X
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-semibold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Novo Perfil
                </button>
              )}
            </div>
          </div>

          {/* MAIN CONTENT: Configuração do Perfil */}
          <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
            {/* Area header */}
            {selectedRole && (
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UserCog className="text-slate-400" size={20} />
                    <div className="relative flex items-center group">
                      <input
                        type="text"
                        value={selectedRole.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoles((prev) => prev.map(r => r.id === selectedRole.id ? { ...r, nome: val } : r));
                        }}
                        className="font-bold text-lg text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 px-1 py-0.5 outline-none transition-colors max-w-[200px]"
                      />
                      <Edit3 size={14} className="text-slate-400 absolute right-[-20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure os módulos e permissões deste perfil.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveRole(selectedRole)}
                  disabled={savingId === selectedRole.id}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 disabled:scale-95 disabled:opacity-70"
                >
                  {savingId === selectedRole.id ? (
                    'SALVANDO...'
                  ) : (
                    <>
                      <Save size={18} /> SALVAR
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Área de Scroll */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {selectedRole ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-4">
                    {CONFIGURABLE_MODULES.map((mod) => {
                      const perms: ModulePermission = selectedRole.permissoes?.[mod.key] || {
                        view_scope: selectedRole.modulos_permitidos.includes(mod.key)
                          ? 'ALL'
                          : 'NONE',
                        edit_scope: 'NONE',
                        can_confirm: false,
                      };
                      const isLinked = perms.view_scope !== 'NONE';

                      return (
                        <div
                          key={mod.key}
                          className={`border rounded-xl transition-all duration-300 ${isLinked ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}
                        >
                          {/* Module Header / Toggle */}
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isLinked ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}
                              >
                                <Settings size={20} />
                              </div>
                              <div
                                className={`${isLinked ? 'cursor-pointer group' : ''}`}
                                onClick={() => {
                                  if (isLinked) setCollapsedModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))
                                }}
                              >
                                <h5
                                  className={`font-bold transition-colors flex items-center gap-2 ${isLinked ? 'text-slate-800 group-hover:text-blue-600' : 'text-slate-500'}`}
                                >
                                  {mod.label}
                                  {isLinked && (
                                    collapsedModules[mod.key] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />
                                  )}
                                </h5>
                                <p className="text-xs text-slate-400">{mod.description}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                handleToggleModuleLink(selectedRole.id, mod.key, !isLinked);
                                if (!isLinked) setCollapsedModules(prev => ({ ...prev, [mod.key]: false }));
                              }}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isLinked ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isLinked ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          </div>

                          {/* Permissions Details (Only if Linked) */}
                          {isLinked && !collapsedModules[mod.key] && (
                            <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* VISUALIZAÇÃO */}
                                {mod.key !== 'gestao_usuarios' && (
                                  <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                                      Visualização
                                    </label>
                                    <select
                                      value={mod.key === 'gestao_estoque' ? 'ALL' : perms.view_scope}
                                      onChange={(e) =>
                                        handlePermissionChange(
                                          selectedRole.id,
                                          mod.key,
                                          'view_scope',
                                          e.target.value,
                                        )
                                      }
                                      disabled={mod.key === 'gestao_estoque'}
                                      className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                      <option value="ALL">👀 Todos</option>
                                      {mod.key !== 'gestao_estoque' && (
                                        <>
                                          <option value="SAME_FARM">🏠 Mesma Fazenda</option>
                                          {mod.key !== 'gestao_postos' && (
                                            <option value="OWN_ONLY">👤 Apenas Próprios</option>
                                          )}
                                        </>
                                      )}
                                    </select>
                                  </div>
                                )}

                                {/* EDIÇÃO/AÇÃO */}
                                <div>
                                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                                    Edição / Manutenção
                                  </label>
                                  <select
                                    value={perms.edit_scope}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        selectedRole.id,
                                        mod.key,
                                        'edit_scope',
                                        e.target.value,
                                      )
                                    }
                                    className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500"
                                  >
                                    <option value="NONE">🔒 Leitura Apenas</option>
                                    {mod.key === 'abrir_solicitacao' ? (
                                      <>
                                        <option value="OWN_PENDING">
                                          📝 Solicitante (Rascunhos)
                                        </option>
                                        <option value="ALL">🛠️ Gerenciamento Completo</option>
                                      </>
                                    ) : (mod.key === 'gestao_transferencias' || mod.key === 'gestao_recebimento') ? (
                                      <>
                                        <option value="OWN_ONLY">👤 Apenas Próprios</option>
                                        <option value="ALL">🛠️ Gerenciamento Total</option>
                                      </>
                                    ) : mod.simpleEdit ? (
                                      <option value="ALL">🛠️ Gerenciamento Total</option>
                                    ) : (
                                      <>
                                        <option value="OWN_PENDING">
                                          📝 Próprios (Se Pendente)
                                        </option>
                                        <option value="OWN_ONLY">👤 Próprios (Sempre)</option>
                                        <option value="ALL">🛠️ Gerenciamento Total</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                {/* AÇÕES ESPECÍFICAS */}
                                {mod.supportsConfirm && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.can_confirm ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.can_confirm && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={perms.can_confirm}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'can_confirm',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          {mod.confirmLabel || 'Confirmar'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          {mod.confirmDescription || 'Aprovar registros'}
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {mod.supportsFleetManagement && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.manage_fleet ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.manage_fleet && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={!!perms.manage_fleet}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'manage_fleet',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          Gestão de Frota
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          Importar/Editar Veículos
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {mod.supportsNotifications && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.manage_notifications ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.manage_notifications && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={!!perms.manage_notifications}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'manage_notifications',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          {mod.key === 'gestao_limpeza' ? 'Configurar E-mails e Fazendas' : (mod.key === 'gestao_drenagem' ? 'Notificações de Drenagem' : (mod.key === 'gestao_recebimento' ? 'Notificações de Recebimento' : (mod.key === 'gestao_nfs' ? 'Notificações de NFs' : 'Notificações de Estoque')))}
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          Recebe/Configura E-mails
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {mod.supportsManualFueling && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.can_create_manual !== false ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.can_create_manual !== false && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={perms.can_create_manual !== false}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'can_create_manual',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          Lançamento Manual
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          Botão "+ Baixar Combustível"
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {mod.supportsIgnoreNuntec && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.can_ignore_nuntec ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.can_ignore_nuntec && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={!!perms.can_ignore_nuntec}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'can_ignore_nuntec',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          Ignorar Pendência Nuntec
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          Permite ocultar itens da lista
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {mod.supportsRoleManagement && (
                                  <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 w-full transition-colors">
                                      <div
                                        className={`w-5 h-5 rounded border flex items-center justify-center ${perms.manage_roles ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white border-slate-300'}`}
                                      >
                                        {perms.manage_roles && <Check size={14} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={!!perms.manage_roles}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            selectedRole.id,
                                            mod.key,
                                            'manage_roles',
                                            e.target.checked,
                                          )
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-700">
                                          Gerenciar Funções
                                        </span>
                                        <span className="text-[10px] text-slate-400 leading-tight">
                                          Criar/Editar Perfis
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {!mod.supportsConfirm &&
                                  !mod.supportsFleetManagement &&
                                  !mod.supportsRoleManagement &&
                                  !mod.supportsManualFueling &&
                                  !mod.supportsIgnoreNuntec && (
                                    <div className="flex items-end pb-1 text-slate-300 text-xs italic">
                                      Ações extras não aplicáveis
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <LayoutGrid size={64} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Selecione um perfil para configurar</p>
                  <p className="text-sm">Ou crie um novo perfil na barra lateral.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
