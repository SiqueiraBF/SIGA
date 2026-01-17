import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import { Lock, Check, Loader2 } from 'lucide-react';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não conferem.');
      return;
    }

    if (newPassword.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Verificar senha atual
      const userCheck = await db.getUserById(user.id);

      // Nota: Em um sistema real, isso seria feito no backend com hash.
      // Aqui, comparamos texto plano conforme estrutura atual.
      if (userCheck && userCheck.senha !== currentPassword) {
        setError('Senha atual incorreta.');
        setLoading(false);
        return;
      }

      await db.updateUser(user.id, { senha: newPassword }, user.id);
      alert('Senha alterada com sucesso!');

      // Limpar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <ModalHeader
          title="Alterar Senha"
          subtitle="Atualize suas credenciais de acesso."
          icon={Lock}
          iconClassName="bg-slate-100 text-slate-600 border-slate-200"
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-4 bg-slate-50/50">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha Atual</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••"
              />
            </div>

            <div className="pt-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nova Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••"
              />
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Salvar Nova Senha
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
}
