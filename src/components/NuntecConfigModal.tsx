import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Database, Wifi } from 'lucide-react';
import { db } from '../services/supabaseService';
import { nuntecService } from '../services/nuntecService';
import { IntegrationConfig, Usuario } from '../types';

interface NuntecConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Usuario | null;
}

export function NuntecConfigModal({ isOpen, onClose, currentUser }: NuntecConfigModalProps) {
  const [config, setConfig] = useState<Partial<IntegrationConfig>>({
    is_active: true,
    username: '',
    password: '',
    sync_start_date: '2026-01-01',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    } else {
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const data = await db.getIntegrationConfig();
      if (data) {
        setConfig(data);
      } else {
        setConfig({
          is_active: true,
          username: 'bruno.siqueira',
          password: '',
          sync_start_date: '2026-01-01',
        });
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao carregar configurações.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestConnection(e: React.MouseEvent) {
    e.preventDefault(); // Prevent form submit
    setError('');
    setSuccess('');
    setIsTesting(true);

    try {
      if (!config.username || !config.password) {
        throw new Error('Informe Usuário e Senha para testar.');
      }

      await nuntecService.testConnection(config);
      setSuccess('Conexão estabelecida com sucesso! Credenciais válidas.');
    } catch (err: any) {
      console.error(err);
      setError('Falha ao conectar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (!config.username || !config.password || !config.sync_start_date) {
        throw new Error('Todos os campos são obrigatórios.');
      }

      await db.saveIntegrationConfig(config, currentUser.id);
      setSuccess('Configuração salva com sucesso!');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Integração Nuntec</h3>
              <p className="text-xs text-slate-500">Configuração de API Externa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2 border border-emerald-100">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Carregando...</div>
          ) : (
            <>
              {/* Toggle Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-700">Integração Ativa</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.is_active}
                    onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">
                    Usuário API
                  </label>
                  <input
                    type="text"
                    value={config.username || ''}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                    placeholder="ex: usuario.api"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">
                    Senha API
                  </label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">
                    Sincronizar A Partir De
                  </label>
                  <input
                    type="date"
                    value={config.sync_start_date || ''}
                    onChange={(e) => setConfig({ ...config, sync_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Data de corte para buscar transferências passadas.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isLoading}
              className="bg-white text-amber-600 hover:bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <div className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              Testar Conexão
            </button>

            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
