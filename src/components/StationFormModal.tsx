import { useState, useEffect } from 'react';
import { Edit2, Plus, Building2, Droplet, Trash2 } from 'lucide-react'; // Added Droplet and Trash2
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
  const [tipo, setTipo] = useState<'FISICO' | 'VIRTUAL'>('FISICO');
  const [tanquesAdicionais, setTanquesAdicionais] = useState<{ id: string; nome: string }[]>([]);
  const [exibirNaDrenagem, setExibirNaDrenagem] = useState(true); // New State
  const [novoTanque, setNovoTanque] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setNome(initialData.nome);
        setFazendaId(initialData.fazenda_id);
        setAtivo(initialData.ativo !== false);
        setNuntecReservoirId(initialData.nuntec_reservoir_id || '');
        setTipo(initialData.tipo || 'FISICO');
        setTanquesAdicionais(initialData.tanques_adicionais || []);
        setExibirNaDrenagem(initialData.exibir_na_drenagem !== false); // Default to true if undefined
      } else {
        setNome('');
        setFazendaId('');
        setAtivo(true);
        setNuntecReservoirId('');
        setTipo('FISICO');
        setTanquesAdicionais([]);
        setExibirNaDrenagem(true);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Force drainage off for non-physical stations
      const isPhysical = tipo === 'FISICO';
      const finalDrainage = isPhysical ? exibirNaDrenagem : false;

      await onSave({
        nome,
        fazenda_id: fazendaId, // Ensure we send the ID, not the object if incompatible
        tipo,
        ativo,
        nuntec_reservoir_id: nuntecReservoirId, // Keep as string, backend will handle parsing
        exibir_na_drenagem: finalDrainage,
        tanques_adicionais: isPhysical ? tanquesAdicionais : null // Clear extra tanks if not physical
      });
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

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Posto
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('FISICO')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-all ${tipo === 'FISICO'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <div className="p-1.5 rounded-full bg-white/50">
                      <Building2 size={16} />
                    </div>
                    <span className="text-xs font-bold">Físico (Tanque)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('VIRTUAL')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-all ${tipo === 'VIRTUAL'
                      ? 'bg-sky-50 border-sky-200 text-sky-700 ring-1 ring-sky-200'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <div className="p-1.5 rounded-full bg-white/50">
                      <Building2 size={16} /> {/* Could use Cloud here if imported */}
                    </div>
                    <span className="text-xs font-bold">Virtual (Gerencial)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-8">
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

            {/* Configurações de Drenagem (Agrupado) */}
            {tipo === 'FISICO' && (
              <div className="pt-4 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-blue-50 rounded text-blue-600">
                    <Droplet size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Configurações de Drenagem
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* 1. Checkbox Exibir na Drenagem */}
                  <label className="flex items-center gap-2 cursor-pointer select-none p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={exibirNaDrenagem}
                      onChange={(e) => setExibirNaDrenagem(e.target.checked)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-700 block">Exibir na Tela de Drenagem</span>
                      <span className="text-[11px] text-slate-500 block">
                        Se desmarcado, este posto não aparecerá na lista de drenagem em lote.
                      </span>
                    </div>
                  </label>

                  {/* 2. Tanques Adicionais (Só faz sentido se for exibido e Fisico) */}
                  <div className="pl-2 border-l-2 border-slate-100 ml-2">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                      Tanques Adicionais (Opcional)
                    </label>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={novoTanque}
                        onChange={(e) => setNovoTanque(e.target.value)}
                        placeholder="Nome do Tanque (Ex: Tanque 02)"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (novoTanque.trim()) {
                            setTanquesAdicionais([...tanquesAdicionais, { id: Math.random().toString(36).substr(2, 9), nome: novoTanque.trim() }]);
                            setNovoTanque('');
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {tanquesAdicionais.length > 0 && (
                      <div className="space-y-2">
                        {tanquesAdicionais.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm shadow-sm">
                            <span className="font-medium text-slate-700">{t.nome}</span>
                            <button
                              type="button"
                              onClick={() => setTanquesAdicionais(tanquesAdicionais.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">
                      Adicione identificadores apenas se houver múltiplos reservatórios para este posto.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
