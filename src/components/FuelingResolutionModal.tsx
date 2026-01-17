import React, { useState, useEffect } from 'react';
import { Save, Droplet, User, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Fazenda, Posto, Veiculo, NuntecTransfer } from '../types';
import { fuelService } from '../services/fuelService';
import { vehicleService } from '../services/vehicleService';
import { useAuth } from '../context/AuthContext';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface FuelingResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  transfer: NuntecTransfer;
  fazendas: Fazenda[];
  postos: Posto[];
}

const OPERACOES = [
  '01 - Plantio',
  '02 - Colheita',
  '03 - Pulverização',
  '04 - Transporte',
  '12 - Geração de energia',
  '15 - Preparação do solo',
  '19 - Corretivos e fertilizantes',
  '25 - Transporte de Pessoas',
  '49 - Abertura de área',
  '173 - Benfeitoria/manutenção',
];

const CULTURAS = [
  '01 - Soja',
  '02 - Milho',
  '03 - Arroz',
  '04 - Algodão',
  '05 - Feijão',
  '12 - Sorgo',
  '13 - Milheto',
  '21 - Pastagem',
  '25 - Crotalaria',
  '56 - Gergelim',
  '26 - Pecuária',
  '06 - Silagem',
];

export function FuelingResolutionModal({
  isOpen,
  onClose,
  onResolve,
  transfer,
  fazendas,
  postos,
}: FuelingResolutionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [veiculosLista, setVeiculosLista] = useState<Veiculo[]>([]);

  // Form State (Derived from Transfer)
  const [dataAbastecimento, setDataAbastecimento] = useState('');
  const [volume, setVolume] = useState('');
  const [postoId, setPostoId] = useState('');
  const [fazendaId, setFazendaId] = useState('');

  // Pre-filled but editable
  const [operador, setOperador] = useState('');

  // User Input Required
  const [veiculoPossuiCadastro, setVeiculoPossuiCadastro] = useState(true);
  const [veiculoId, setVeiculoId] = useState('');
  const [veiculoNome, setVeiculoNome] = useState('');
  const [operacao, setOperacao] = useState('');
  const [cultura, setCultura] = useState('');
  const [tipoMarcador, setTipoMarcador] = useState<'ODOMETRO' | 'HORIMETRO' | 'SEM_MEDIDOR'>(
    'ODOMETRO',
  );
  const [leituraMarcador, setLeituraMarcador] = useState('');
  const [motivoSemMarcador, setMotivoSemMarcador] = useState('');

  useEffect(() => {
    if (isOpen && transfer) {
      vehicleService.getAll().then(setVeiculosLista).catch(console.error);

      // 1. Map Transfer Data
      setDataAbastecimento(transfer['start-at'] || new Date().toISOString());
      setVolume(Math.abs(transfer['pointing-in'].amount).toString()); // Ensure positive
      setOperador(transfer.operatorName || transfer['operator-id'] || '');

      // 2. Find Posto/Fazenda based on Nuntec Reservoir ID
      const reservoirId = transfer['pointing-in']['reservoir-id'];
      const matchedPosto = postos.find((p) => p.nuntec_reservoir_id === reservoirId);

      if (matchedPosto) {
        setPostoId(matchedPosto.id);
        setFazendaId(matchedPosto.fazenda_id); // Auto-select Farm
      } else {
        // Fallback: Should not happen if filtered correctly, but warn
        console.warn('Posto não encontrado para reservatório Nuntec ID:', reservoirId);
      }

      // Defaults for new inputs
      setVeiculoPossuiCadastro(true);
      setVeiculoId('');
      setVeiculoNome('');
      setOperacao('');
      setCultura('');
      setTipoMarcador('ODOMETRO');
      setLeituraMarcador('');
      setMotivoSemMarcador('');
    }
  }, [isOpen, transfer, postos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        data_abastecimento: new Date(dataAbastecimento).toISOString(),
        fazenda_id: fazendaId,
        posto_id: postoId,
        veiculo_possui_cadastro: veiculoPossuiCadastro,
        veiculo_id: veiculoPossuiCadastro ? veiculoId : null,
        veiculo_nome: veiculoPossuiCadastro
          ? veiculosLista.find((v) => v.id === veiculoId)?.identificacao
          : veiculoNome,
        volume: parseFloat(volume),
        operador,
        operacao,
        cultura,
        tipo_marcador: tipoMarcador,
        leitura_marcador: tipoMarcador !== 'SEM_MEDIDOR' ? parseFloat(leituraMarcador) : null,
        motivo_sem_marcador: tipoMarcador === 'SEM_MEDIDOR' ? motivoSemMarcador : null,
        usuario_id: user?.id || '',
        status: 'PENDENTE', // Goes to Pendente for final check or directly Finalized? Sticking to existing flow.
        nuntec_transfer_id: transfer.id,
      };

      await fuelService.createAbastecimento(payload, user!.id);
      onResolve();
      onClose();
    } catch (error: any) {
      console.error('Erro ao resolver pendência:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const postoNome = postos.find((p) => p.id === postoId)?.nome || 'Posto Desconhecido';
  const fazendaNome = fazendas.find((f) => f.id === fazendaId)?.nome || 'Fazenda Desconhecida';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title="Resolver Pendência (Integração Nuntec)"
          icon={CheckCircle}
          iconClassName="text-amber-600 bg-amber-50 border-amber-100"
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
            {/* Summary Card of the Transfer */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">
                    Data Transferência
                  </p>
                  <p className="text-sm font-medium text-amber-900">
                    {new Date(dataAbastecimento).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">Origem (Posto)</p>
                  <p className="text-sm font-medium text-amber-900">
                    {fazendaNome} - {postoNome}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">Volume</p>
                  <p className="text-lg font-bold text-amber-900">
                    {parseFloat(volume).toFixed(2)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">Operador (API)</p>
                  <p className="text-sm font-medium text-amber-900 truncate" title={operador}>
                    {operador}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Identificação do Veículo
                </h3>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-slate-700 block">
                      Veículo Possui Cadastro?
                    </label>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(true)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${veiculoPossuiCadastro ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(false)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!veiculoPossuiCadastro ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>

                  {veiculoPossuiCadastro ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Selecione o Veículo *
                      </label>
                      <select
                        required={veiculoPossuiCadastro}
                        value={veiculoId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVeiculoId(val);
                          const selected = veiculosLista.find((v) => v.id === val);
                          if (selected) setVeiculoNome(selected.identificacao);
                        }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                      >
                        <option value="">Buscar na frota...</option>
                        {veiculosLista.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.identificacao}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Identificação Manual *
                      </label>
                      <input
                        type="text"
                        required={!veiculoPossuiCadastro}
                        value={veiculoNome}
                        onChange={(e) => setVeiculoNome(e.target.value)}
                        placeholder="Ex: Trator Alugado (Placa XYZ)"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Medidor Atual *
                  </label>
                  <div className="flex gap-2 mb-2">
                    {(['ODOMETRO', 'HORIMETRO', 'SEM_MEDIDOR'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTipoMarcador(type)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          tipoMarcador === type
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  {tipoMarcador !== 'SEM_MEDIDOR' ? (
                    <input
                      type="number"
                      required
                      placeholder="Leitura..."
                      value={leituraMarcador}
                      onChange={(e) => setLeituraMarcador(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  ) : (
                    <select
                      required
                      value={motivoSemMarcador}
                      onChange={(e) => setMotivoSemMarcador(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Motivo...</option>
                      <option value="QUEBRADO">Quebrado/Defeito</option>
                      <option value="SEM_EQUIPAMENTO">Não Possui</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                  <Droplet size={16} /> Detalhes do Serviço
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Operação *
                  </label>
                  <select
                    required
                    value={operacao}
                    onChange={(e) => setOperacao(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">Selecione...</option>
                    {OPERACOES.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cultura *</label>
                  <select
                    required
                    value={cultura}
                    onChange={(e) => setCultura(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">Selecione...</option>
                    {CULTURAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Operador (Nome)
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      required
                      value={operador}
                      onChange={(e) => setOperador(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Preenchido automaticamente pela integração Nuntec, mas pode ser ajustado.
                  </p>
                </div>
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
              disabled={loading || !postoId}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-colors shadow-lg shadow-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
              ) : (
                <Save size={20} />
              )}
              Confirmar Baixa
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
}
