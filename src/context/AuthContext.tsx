import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario, Funcao, Modulo } from '../types';

interface PermissionCheckParams {
  module: Modulo;
  action: 'view' | 'edit' | 'confirm' | 'delete';
  resourceOwnerId?: string;
  resourceFarmId?: string;
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
      // Tentativa de restaurar a sessão segura do Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;

      // Sem o fallback! Se não houver sessão do Supabase, o usuário NÃO entra.
      if (!userId) {
        setIsLoading(false);
        return;
      }

      if (userId) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*, fazenda:fazendas(nome)')
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

      const cleanLogin = loginStr.trim().toLowerCase();

      if (!senha) {
        throw new Error('Senha é obrigatória.');
      }

      // Artificial delay para dificultar brute-force (client-side)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Usar a Autenticação Segura do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${cleanLogin}@nadiana.com.br`,
        password: senha.trim()
      });

      if (authError) {
        console.error('Supabase Auth error:', authError);
        setIsLoading(false);
        if (authError.message.includes('Too many requests') || authError.status === 429) {
           throw new Error('Muitas tentativas falhas. Conta bloqueada temporariamente pelo servidor.');
        }
        throw new Error('Login ou senha incorretos.');
      }

      const userId = authData.user.id;

      // Buscar perfil na tabela de usuários
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('*, fazenda:fazendas(nome)')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        console.error('Supabase query error:', error);
        setIsLoading(false);
        throw new Error('Perfil de usuário não encontrado no banco.');
      }

      const foundUser = userData as Usuario;

      if (!foundUser.ativo) {
        setIsLoading(false);
        throw new Error('Usuário inativo.');
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

      // O localStorage legado não é mais utilizado para acesso

      setIsLoading(false);
      return true;
    } catch (e: any) {
      console.error('Login error', e);
      setIsLoading(false);
      if (e instanceof Error) {
        throw e;
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch(e) {
      console.error('Erro ao deslogar do supabase:', e);
    }
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
    resourceFarmId,
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
      if (perms.view_scope === 'OWN_ONLY') return !resourceOwnerId || resourceOwnerId === user.id;
      if (perms.view_scope === 'SAME_FARM') {
        if (!resourceFarmId) return true; // General view access allowed
        if (user.fazenda_id && resourceFarmId) {
          return user.fazenda_id === resourceFarmId;
        }
        return false;
      }
      return false;
    }

    if (action === 'edit') {
      if (perms.edit_scope === 'ALL') return true;
      if (perms.edit_scope === 'OWN_ONLY') return !resourceOwnerId || resourceOwnerId === user.id;
      if (perms.edit_scope === 'OWN_PENDING') {
        if (!resourceOwnerId) return true;
        return resourceOwnerId === user.id && resourceStatus === 'PENDENTE';
      }
      return false;
    }

    if (action === 'confirm') {
      return perms.can_confirm;
    }

    if (action === 'delete') {
      const deleteScope = perms.delete_scope || 'NONE';
      if (deleteScope === 'ALL') return true;
      if (deleteScope === 'OWN_ONLY') return !resourceOwnerId || resourceOwnerId === user.id;
      return false;
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
