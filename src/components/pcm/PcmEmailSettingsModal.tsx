import React, { useState, useEffect } from 'react';
import { X, Save, Mail, AlertCircle, Building2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { farmService } from '../../services/farmService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface PcmEmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PcmEmailSettingsModal({ isOpen, onClose }: PcmEmailSettingsModalProps) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  
  const [pcmToAlmoxEmails, setPcmToAlmoxEmails] = useState('');
  const [ccPcmToAlmox, setCcPcmToAlmox] = useState('');
  const [almoxToComprasEmails, setAlmoxToComprasEmails] = useState('');
  const [ccAlmoxToCompras, setCcAlmoxToCompras] = useState('');

  const isAdmin = role?.nome === 'Administrador';

  useEffect(() => {
    if (isOpen) {
      loadFarms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFarm) {
      loadParameters();
    }
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const data = await farmService.getFarms();
      setFarms(data);
      if (data.length > 0 && !selectedFarm) {
        setSelectedFarm(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadParameters = async () => {
    setLoading(true);
    setPcmToAlmoxEmails('');
    setCcPcmToAlmox('');
    setAlmoxToComprasEmails('');
    setCcAlmoxToCompras('');

    try {
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .in('key', [`pcm_to_almox_${selectedFarm}`, `almox_to_compras_${selectedFarm}`]);

      if (error) throw error;

      const pcmToAlmox = data?.find(p => p.key === `pcm_to_almox_${selectedFarm}`);
      const almoxToCompras = data?.find(p => p.key === `almox_to_compras_${selectedFarm}`);

      if (pcmToAlmox) {
        try {
          const parsed = JSON.parse(pcmToAlmox.value);
          setPcmToAlmoxEmails(parsed.to || '');
          setCcPcmToAlmox(parsed.cc || '');
        } catch {
          // Fallback legacy value
          setPcmToAlmoxEmails(pcmToAlmox.value || '');
        }
      }

      if (almoxToCompras) {
        try {
          const parsed = JSON.parse(almoxToCompras.value);
          setAlmoxToComprasEmails(parsed.to || '');
          setCcAlmoxToCompras(parsed.cc || '');
        } catch {
          // Fallback legacy value
          setAlmoxToComprasEmails(almoxToCompras.value || '');
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
    if (!selectedFarm) return;
    setLoading(true);

    try {
      // Upsert PCM -> Almox
      await supabase
        .from('system_parameters')
        .upsert({
          key: `pcm_to_almox_${selectedFarm}`,
          value: JSON.stringify({ to: pcmToAlmoxEmails, cc: ccPcmToAlmox }),
          description: `Destinatários etapa 1 (Almoxarifado) da fazenda ${selectedFarm} (JSON)`
        }, { onConflict: 'key' });

      // Upsert Almox -> Compras
      await supabase
        .from('system_parameters')
        .upsert({
          key: `almox_to_compras_${selectedFarm}`,
          value: JSON.stringify({ to: almoxToComprasEmails, cc: ccAlmoxToCompras }),
          description: `Destinatários etapa 2 (Compras) da fazenda ${selectedFarm} (JSON)`
        }, { onConflict: 'key' });

      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Destinatários PCM/Almox</h2>
              <p className="text-sm text-slate-500">Separar contatos por ponto e vírgula (;)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Seletor de Fazenda */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              Selecione a Unidade (Fazenda)
            </label>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="" disabled>Selecione...</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Etapa 1: PCM -> Almoxarifado */}
            <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl relative">
              <div className="absolute top-0 right-0 py-1 px-3 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-bl-xl rounded-tr-xl">
                Etapa 1
              </div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Para (To)</label>
              <span className="block text-xs text-slate-500 mb-2">E-mails (ex: almoxarifado@)</span>
              <textarea
                value={pcmToAlmoxEmails}
                onChange={(e) => setPcmToAlmoxEmails(e.target.value)}
                placeholder="nome@dominio.com; outro@dominio.com"
                rows={2}
                disabled={!isAdmin}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono disabled:opacity-50 mb-4"
              />

              <label className="block text-sm font-bold text-slate-800 mb-1">Com Cópia (CC)</label>
              <textarea
                value={ccPcmToAlmox}
                onChange={(e) => setCcPcmToAlmox(e.target.value)}
                placeholder="Opcional..."
                rows={2}
                disabled={!isAdmin}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono disabled:opacity-50 text-slate-600"
              />
            </div>

            {/* Etapa 2: Almoxarifado -> Compras */}
            <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl relative">
              <div className="absolute top-0 right-0 py-1 px-3 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-bl-xl rounded-tr-xl">
                Etapa 2
              </div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Para (To)</label>
              <span className="block text-xs text-slate-500 mb-2">E-mails (ex: compras@)</span>
              <textarea
                value={almoxToComprasEmails}
                onChange={(e) => setAlmoxToComprasEmails(e.target.value)}
                placeholder="nome@dominio.com; outro@dominio.com"
                rows={2}
                disabled={!isAdmin}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono disabled:opacity-50 mb-4"
              />

              <label className="block text-sm font-bold text-slate-800 mb-1">Com Cópia (CC)</label>
              <textarea
                value={ccAlmoxToCompras}
                onChange={(e) => setCcAlmoxToCompras(e.target.value)}
                placeholder="Opcional..."
                rows={2}
                disabled={!isAdmin}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono disabled:opacity-50 text-slate-600"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl flex gap-3 text-amber-800 text-sm">
            <AlertCircle className="flex-shrink-0" size={20} />
            <p>
              Os remetentes (Quem envia) sempre serão definidos automaticamente pelo usuário logado no sistema que apertou o botão "Salvar".
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Fechar
          </button>
          
          {isAdmin && (
            <button
              onClick={saveParameters}
              disabled={loading || !selectedFarm}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:active:scale-100 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <Save size={18} />
              Salvar Destinatários
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
