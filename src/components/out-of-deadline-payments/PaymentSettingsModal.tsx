import React, { useState, useEffect } from 'react';
import { X, Save, Mail, AlertCircle, Building2, List, Plus, Trash2, Power } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { farmService } from '../../services/farmService';
import { outOfDeadlinePaymentService, OutOfDeadlinePaymentSector } from '../../services/outOfDeadlinePaymentService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface PaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentSettingsModal({ isOpen, onClose }: PaymentSettingsModalProps) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'emails' | 'sectors' | 'units'>('emails');
  
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');

  const [sectors, setSectors] = useState<OutOfDeadlinePaymentSector[]>([]);
  const [newSector, setNewSector] = useState('');

  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [newUnit, setNewUnit] = useState('');

  const isAdmin = role?.nome === 'Administrador';

  useEffect(() => {
    if (isOpen) {
      loadUnits();
      loadSectors();
      loadAllUnits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedUnit) {
      loadParameters();
    }
  }, [selectedUnit]);

  const loadUnits = async () => {
    try {
      const data = await outOfDeadlinePaymentService.getUnits();
      setUnits(data);
      if (data.length > 0 && !selectedUnit) {
        setSelectedUnit(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAllUnits = async () => {
    try {
      const data = await outOfDeadlinePaymentService.getAllUnits();
      setAllUnits(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSectors = async () => {
    try {
      const data = await outOfDeadlinePaymentService.getSectors();
      setSectors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadParameters = async () => {
    setLoading(true);
    setToEmails('');
    setCcEmails('');

    try {
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .eq('key', `pagamentos_atrasados_${selectedUnit}`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        try {
          const parsed = JSON.parse(data.value);
          setToEmails(parsed.to || '');
          setCcEmails(parsed.cc || '');
        } catch {
          setToEmails(data.value || '');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveParameters = async () => {
    if (!selectedUnit) return;
    setLoading(true);

    try {
      await supabase
        .from('system_parameters')
        .upsert({
          key: `pagamentos_atrasados_${selectedUnit}`,
          value: JSON.stringify({ to: toEmails, cc: ccEmails }),
          description: `Destinatários de Autorizações de Pagamento Atrasado da unidade ${selectedUnit} (JSON)`
        }, { onConflict: 'key' });

      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSector = async () => {
    if (!newSector.trim()) return;
    setLoading(true);
    try {
      await outOfDeadlinePaymentService.createSector(newSector.trim());
      setNewSector('');
      loadSectors();
      toast.success('Setor adicionado');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar setor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    if (!confirm('Deseja realmente excluir este setor?')) return;
    setLoading(true);
    try {
      await outOfDeadlinePaymentService.deleteSector(id);
      loadSectors();
      toast.success('Setor removido');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover setor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) return;
    setLoading(true);
    try {
      await outOfDeadlinePaymentService.createUnit(newUnit.trim());
      setNewUnit('');
      loadAllUnits();
      loadUnits();
      toast.success('Unidade adicionada');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar unidade');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUnit = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await outOfDeadlinePaymentService.toggleUnitStatus(id, !currentStatus);
      loadAllUnits();
      loadUnits();
      toast.success('Status atualizado');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100">
              {activeTab === 'emails' ? <Mail size={22} /> : activeTab === 'sectors' ? <List size={22} /> : <Building2 size={22} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Configurações</h2>
              <p className="text-sm text-slate-500">Módulo de Autorizações Fora do Prazo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('emails')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'emails' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            E-mails
          </button>
          <button
            onClick={() => setActiveTab('sectors')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'sectors' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Setores
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'units' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Unidades
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'emails' ? (
            <>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  Selecione a Unidade
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl relative">
                <label className="block text-sm font-bold text-slate-800 mb-1">Para (To)</label>
                <textarea
                  value={toEmails}
                  onChange={(e) => setToEmails(e.target.value)}
                  placeholder="diretor@dominio.com; outro@dominio.com"
                  rows={2}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none font-mono disabled:opacity-50 mb-4"
                />

                <label className="block text-sm font-bold text-slate-800 mb-1">Cópia (CC)</label>
                <textarea
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="financeiro@dominio.com; gestor@dominio.com"
                  rows={2}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-teal-500 outline-none resize-none font-mono disabled:opacity-50 text-slate-600"
                />
              </div>
            </>
          ) : activeTab === 'sectors' ? (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    placeholder="Nome do novo setor"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSector()}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button
                    onClick={handleAddSector}
                    disabled={!newSector.trim() || loading}
                    className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}
              
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {sectors.map(sector => (
                    <li key={sector.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">{sector.nome}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSector(sector.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Nome da nova unidade"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button
                    onClick={handleAddUnit}
                    disabled={!newUnit.trim() || loading}
                    className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}
              
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {allUnits.map(unit => (
                    <li key={unit.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{unit.nome}</span>
                        <span className={`text-[10px] font-bold ${unit.ativo ? 'text-teal-600' : 'text-slate-400'}`}>
                          {unit.ativo ? 'ATIVA' : 'INATIVA'}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleUnit(unit.id, unit.ativo)}
                            className={`p-1.5 rounded-lg transition-colors ${unit.ativo ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'}`}
                            title={unit.ativo ? 'Desativar' : 'Ativar'}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if(confirm('Excluir permanentemente?')) {
                                outOfDeadlinePaymentService.deleteUnit(unit.id).then(() => {
                                  loadAllUnits();
                                  loadUnits();
                                });
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Fechar
          </button>
          
          {isAdmin && activeTab === 'emails' && (
            <button
              onClick={saveParameters}
              disabled={loading || !selectedUnit}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:active:scale-100 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/25 active:scale-95"
            >
              <Save size={18} />
              Salvar Configurações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
