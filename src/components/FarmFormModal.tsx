import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import type { Fazenda } from '../types';
import { Save, Building2 } from 'lucide-react';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface FarmFormModalProps {
  farm: Fazenda | null; // null = creating new farm
  onClose: (saved: boolean) => void;
}

const farmSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  ativo: z.boolean(),
});

type FarmFormData = z.infer<typeof farmSchema>;

export function FarmFormModal({ farm, onClose }: FarmFormModalProps) {
  const { user: currentUser } = useAuth();
  const isEditing = !!farm;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      nome: farm?.nome || '',
      ativo: farm?.ativo ?? true,
    },
  });

  const onSubmit = async (data: FarmFormData) => {
    if (!currentUser) return;

    try {
      if (isEditing) {
        // Update existing farm
        db.updateFarm(
          farm.id,
          {
            nome: data.nome,
            ativo: data.ativo,
          },
          currentUser.id,
        );
        // alert('Filial atualizada com sucesso!');
      } else {
        // Create new farm
        db.createFarm(
          {
            nome: data.nome,
            ativo: data.ativo,
          },
          currentUser.id,
        );
        // alert('Filial criada com sucesso!');
      }
      onClose(true);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => onClose(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={isEditing ? 'Editar Filial' : 'Nova Filial'}
          subtitle={isEditing ? 'Atualize os dados da fazenda' : 'Cadastre uma nova unidade'}
          icon={isEditing ? Save : Building2}
          iconClassName="text-green-600"
          onClose={() => onClose(false)}
        />

        <div className="flex-1 overflow-y-auto">
          <form id="farm-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nome da Filial <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nome')}
                type="text"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="Ex: Fazenda Santa Cruz"
              />
              {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  {...register('ativo')}
                  type="checkbox"
                  className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500 transition-all"
                />
                <span className="text-sm font-semibold text-slate-700 group-hover:text-green-600 transition-colors">
                  Filial Ativa
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-8">
                Filiais inativas não aparecem nas opções de seleção
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Importante:</span> Ao desativar uma filial, os
                usuários vinculados a ela não poderão criar novas solicitações.
              </p>
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
            form="farm-form"
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-500/30 w-full sm:w-auto"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Filial'}
          </button>
        </ModalFooter>
      </div>
    </div>
  );
}
