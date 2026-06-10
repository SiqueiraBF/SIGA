import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { db, roleService } from '../services/supabaseService';
import { graphService } from '../services/graphService';
import type { Usuario, Funcao, Fazenda } from '../types';
import { Save, UserPlus, Eye, EyeOff, Wand2, Mail, Phone, AtSign, User } from 'lucide-react';
import toast from 'react-hot-toast';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface UserFormModalProps {
  user: Usuario | null; // null = creating new user
  onClose: (saved: boolean) => void;
}

const userSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  login: z.string().min(3, 'Login deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').or(z.literal('')),
  telefone: z.string().optional(),
  senha: z.string().optional(), // Pode ser opcional na edição
  funcao_id: z.string().min(1, 'Selecione uma função'),
  fazenda_id: z.string().optional(),
  ativo: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const { user: currentUser } = useAuth();
  const isEditing = !!user;
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nome: user?.nome || '',
      login: user?.login || '',
      email: user?.email || '',
      telefone: user?.telefone || '',
      senha: '', // Nunca carrega senha
      funcao_id: user?.funcao_id || '',
      fazenda_id: user?.fazenda_id || '',
      ativo: user?.ativo ?? true,
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [funcoesData, fazendasData, usersData] = await Promise.all([
      roleService.getAll(),
      db.getAllFarms(),
      db.getAllUsers(),
    ]);

    setFuncoes(funcoesData);
    setFazendas(fazendasData);
    setAllUsers(usersData);

    if (user) {
      setValue('funcao_id', user.funcao_id || '', { shouldValidate: true });
      setValue('fazenda_id', user.fazenda_id || '', { shouldValidate: true });
    }
  };

  const generateUniquePassword = () => {
    const newPass = Math.floor(100000 + Math.random() * 900000).toString();
    setValue('senha', newPass, { shouldValidate: true });
    setShowPassword(true);
  };

  const selectedRole = watch('funcao_id');

  const generateEmail = () => {
    const currentLogin = watch('login');
    if (currentLogin) {
      setValue('email', `${currentLogin.toLowerCase()}@nadiana.com.br`, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      alert('Preencha o login primeiro para gerar o e-mail.');
    }
  };

  const onSubmit = async (data: UserFormData) => {
    if (!currentUser) return;

    try {
      if (!isEditing && (!data.senha || data.senha.length < 6)) {
        alert('Erro: A senha deve ter pelo menos 6 caracteres para novos usuários.');
        return;
      }
      if (isEditing && data.senha && data.senha.length < 6) {
        alert('Erro: A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (isEditing) {
        await db.updateUser(
          user.id,
          {
            nome: data.nome,
            login: data.login,
            email: data.email || undefined,
            telefone: data.telefone || undefined,
            senha: data.senha,
            funcao_id: data.funcao_id,
            fazenda_id: data.fazenda_id || undefined,
            ativo: data.ativo,
          },
          currentUser.id,
        );
        // alert('Usuário atualizado com sucesso!');
      } else {
        await db.createUser(
          {
            nome: data.nome,
            login: data.login,
            email: data.email || undefined,
            telefone: data.telefone || undefined,
            senha: data.senha,
            funcao_id: data.funcao_id,
            fazenda_id: data.fazenda_id || undefined,
            ativo: data.ativo,
          },
          currentUser.id,
        );
        // Enviar e-mail de boas-vindas
        if (data.email) {
          const systemUrl = window.location.origin;
          const subject = 'Bem-vindo ao Sistema SIGA';
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0d9488; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Sistema SIGA</h1>
              </div>
              <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #0f766e; margin-top: 0;">Olá, ${data.nome}!</h2>
                <p style="font-size: 16px; line-height: 1.5;">Seu acesso ao Sistema SIGA foi criado com sucesso.</p>
                <p style="font-size: 16px; line-height: 1.5;">Abaixo estão suas credenciais para o primeiro acesso:</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Link de Acesso:</strong> <a href="${systemUrl}" style="color: #0d9488; text-decoration: none;">${systemUrl}</a></p>
                  <p style="margin: 5px 0;"><strong>Usuário (Login):</strong> ${data.login}</p>
                  <p style="margin: 5px 0;"><strong>Senha Temporária:</strong> ${data.senha}</p>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 30px;">Recomendamos que você altere sua senha após o primeiro acesso por motivos de segurança.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Este é um e-mail automático. Por favor, não responda.</p>
              </div>
            </div>
          `;

          try {
            const emailResult = await graphService.sendEmail(
              currentUser.email || 'noreply@nadiana.com.br',
              [data.email],
              subject,
              htmlBody
            );
            if (!emailResult.success) {
              console.error('Erro ao enviar e-mail:', emailResult.error);
              toast.error('Usuário criado, mas houve um erro ao enviar o e-mail de acesso.');
            } else {
              toast.success('Usuário criado e e-mail enviado com sucesso!');
            }
          } catch (emailError) {
            console.error('Erro no catch de envio de e-mail:', emailError);
            toast.error('Usuário criado, mas não foi possível enviar o e-mail.');
          }
        } else {
          toast.success('Usuário criado com sucesso!');
        }
      }
      onClose(true);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const requiresFarm = () => {
    if (!selectedRole) return false;
    const role = funcoes.find((f) => f.id === selectedRole);
    return (
      role?.modulos_permitidos.includes('abrir_solicitacao') &&
      !role?.modulos_permitidos.includes('analisar_cadastros')
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => onClose(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          subtitle={
            isEditing ? 'Atualize as informações do usuário' : 'Cadastre um novo usuário no sistema'
          }
          icon={isEditing ? User : UserPlus}
          onClose={() => onClose(false)}
        />

        <div className="flex-1 overflow-y-auto">
          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('nome')}
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Ex: João da Silva"
                />
                {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}
              </div>

              {/* Login */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Login <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('login')}
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  placeholder="Ex: joao.silva"
                />
                {errors.login && (
                  <p className="text-red-500 text-sm mt-1">{errors.login.message}</p>
                )}
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('senha')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-4 pr-20 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                    placeholder="Digite ou gere a senha"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-slate-100"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={generateUniquePassword}
                      className="text-blue-600 hover:text-blue-700 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                      title="Gerar senha única"
                      tabIndex={-1}
                    >
                      <Wand2 size={18} />
                    </button>
                  </div>
                </div>
                {errors.senha && (
                  <p className="text-red-500 text-sm mt-1">{errors.senha.message}</p>
                )}
              </div>

              {/* Email e Telefone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300"
                      placeholder="usuario@nadiana.com.br"
                    />
                    <button
                      type="button"
                      onClick={generateEmail}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-md transition-all"
                      title="Gerar e-mail com base no login"
                      tabIndex={-1}
                    >
                      <AtSign size={18} />
                    </button>
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Telefone / Celular
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone size={18} />
                    </div>
                    <input
                      {...register('telefone')}
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300"
                      placeholder="(XX) 9XXXX-XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Função */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Função <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('funcao_id')}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Selecione...</option>
                  {funcoes.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nome}
                    </option>
                  ))}
                </select>
                {errors.funcao_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.funcao_id.message}</p>
                )}
              </div>

              {/* Fazenda */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Filial {requiresFarm() && <span className="text-red-500">*</span>}
                </label>
                <select
                  {...register('fazenda_id')}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Central (Sem Filial)</option>
                  {fazendas
                    .filter((f) => f.ativo)
                    .map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.nome}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione a filial de origem do usuário
                </p>
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    {...register('ativo')}
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                    Usuário Ativo
                  </span>
                </label>
              </div>
            </div>
          </form>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Salvando...
              </>
            ) : isEditing ? (
              'Salvar Alterações'
            ) : (
              'Criar Usuário'
            )}
          </button>
        </ModalFooter>
      </div>
    </div>
  );
}
