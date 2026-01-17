import { useState, useEffect } from 'react';
import { Edit2, Plus, Building2 } from 'lucide-react';
import type { Posto, Fazenda } from '../types';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface StationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Posto>) => Promise<void>;
  initialData?: Posto;
  fazendas: Fazenda[];
}

export function StationFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  fazendas,
}: StationFormModalProps) {
  const [nome, setNome] = useState('');
  const [fazendaId, setFazendaId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [nuntecReservoirId, setNuntecReservoirId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setNome(initialData.nome);
        setFazendaId(initialData.fazenda_id);
        setAtivo(initialData.ativo !== false);
        setNuntecReservoirId(initialData.nuntec_reservoir_id || '');
      } else {
        setNome('');
        setFazendaId('');
        setAtivo(true);
        setNuntecReservoirId('');
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ nome, fazenda_id: fazendaId, ativo, nuntec_reservoir_id: nuntecReservoirId });
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar posto:', error);
      alert(`Erro ao salvar posto: ${error.message || 'Verifique os dados e tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <ModalHeader
          title={initialData ? 'Editar Posto' : 'Novo Posto'}
          icon={initialData ? Edit2 : Plus}
          iconClassName="text-blue-600 bg-blue-50 border-blue-100"
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome do Posto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Gerente - Diesel S10"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fazenda <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={fazendaId}
                onChange={(e) => setFazendaId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
              >
                <option value="">Selecione uma fazenda...</option>
                {fazendas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Posto Ativo</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-amber-50 rounded text-amber-600">
                  <Building2 size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Integração Nuntec
                </h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Reservatório Monitorado
                </label>
                <input
                  type="text"
                  value={nuntecReservoirId}
                  onChange={(e) => setNuntecReservoirId(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-mono text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Insira o <strong>ID do reservatório de DESTINO</strong> na API Nuntec.
                  Transferências para este ID serão capturadas como pendências.
                </p>
              </div>
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Posto'}
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
}
