import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario, Funcao, Modulo } from '../types';

interface PermissionCheckParams {
  module: Modulo;
  action: 'view' | 'edit' | 'confirm';
  resourceOwnerId?: string;
  resourceStatus?: string;
}

interface AuthContextType {
  user: Usuario | null;
  role: Funcao | null;
  login: (login: string, senha?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (modulo: string) => boolean;
  checkAccess: (params: PermissionCheckParams) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [role, setRole] = useState<Funcao | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário ao iniciar
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userId = localStorage.getItem('gravity_user_id');
      if (userId) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single();

        if (userData && !error) {
          setUser(userData as Usuario);

          // Carregar função
          if (userData.funcao_id) {
            const { data: roleData } = await supabase
              .from('funcoes')
              .select('*')
              .eq('id', userData.funcao_id)
              .single();

            if (roleData) {
              setRole(roleData as Funcao);
            }
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar usuário', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Heartbeat mechanism
  useEffect(() => {
    if (!user) return;

    const updateHeartbeat = async () => {
      try {
        await supabase
          .from('usuarios')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating heartbeat:', error);
      }
    };

    // Update immediately and then every 5 minutes
    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (loginStr: string, senha?: string) => {
    try {
      setIsLoading(true);

      // Buscar usuário pelo login
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('login', loginStr)
        .eq('ativo', true);

      if (error || !usuarios || usuarios.length === 0) {
        setIsLoading(false);
        return false;
      }

      const foundUser = usuarios[0] as Usuario;

      // Verificar senha (simples por enquanto - em produção usar bcrypt)
      if (senha && foundUser.senha !== senha) {
        setIsLoading(false);
        return false;
      }

      // Update Login Time
      await supabase
        .from('usuarios')
        .update({ last_login: new Date().toISOString() })
        .eq('id', foundUser.id);

      // Update local object
      foundUser.last_login = new Date().toISOString();

      setUser(foundUser);

      // Carregar função
      if (foundUser.funcao_id) {
        const { data: roleData } = await supabase
          .from('funcoes')
          .select('*')
          .eq('id', foundUser.funcao_id)
          .single();

        if (roleData) {
          setRole(roleData as Funcao);
        }
      }

      // Salvar no localStorage
      try {
        localStorage.setItem('gravity_user_id', foundUser.id);
      } catch (e) {
        console.warn('LocalStorage error', e);
      }

      setIsLoading(false);
      return true;
    } catch (e) {
      console.error('Login error', e);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('gravity_user_id');
  };

  const hasPermission = (modulo: string) => {
    if (!role) return false;
    // Legacy or simple check
    return role.modulos_permitidos.includes(modulo as any);
  };

  const checkAccess = ({
    module,
    action,
    resourceOwnerId,
    resourceStatus,
  }: PermissionCheckParams): boolean => {
    if (!role || !user) return false;
    if (role.nome === 'Administrador') return true;

    // Verify if basic access exists
    if (!role.modulos_permitidos.includes(module)) return false;

    // If no advanced Permissions object (legacy role), fallback to safe defaults
    const perms = role.permissoes?.[module];
    if (!perms) {
      // Default Fallback Logic:
      if (action === 'view') return true; // Can View All if has module
      if (action === 'edit') return resourceOwnerId === user.id && resourceStatus === 'PENDENTE'; // Can Edit Own Pending
      if (action === 'confirm') return false; // Cannot confirm default
      return false;
    }

    // Advanced Checks
    if (action === 'view') {
      if (perms.view_scope === 'ALL') return true;
      if (perms.view_scope === 'OWN_ONLY') return resourceOwnerId === user.id;
      return false;
    }

    if (action === 'edit') {
      if (perms.edit_scope === 'ALL') return true;
      if (perms.edit_scope === 'OWN_ONLY') return resourceOwnerId === user.id;
      if (perms.edit_scope === 'OWN_PENDING') {
        return resourceOwnerId === user.id && resourceStatus === 'PENDENTE';
      }
      return false;
    }

    if (action === 'confirm') {
      return perms.can_confirm;
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{ user, role, login, logout, hasPermission, checkAccess, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
