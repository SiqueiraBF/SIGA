import React, { useState, useEffect } from 'react';
import { Save, Droplet, User, MapPin, CheckCircle, AlertTriangle, Search, X } from 'lucide-react';
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
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [isVehicleSearchOpen, setIsVehicleSearchOpen] = useState(false);

  // Form State (Derived from Transfer)
  const [dataAbastecimento, setDataAbastecimento] = useState('');
  const [volume, setVolume] = useState('');
  const [postoId, setPostoId] = useState('');
  const [fazendaId, setFazendaId] = useState('');

  // Pre-filled but editable
  const [operador, setOperador] = useState('');

  // User Input Required
  const [veiculoPossuiCadastro, setVeiculoPossuiCadastro] = useState<boolean | null>(null);
  const [veiculoId, setVeiculoId] = useState('');
  const [veiculoNome, setVeiculoNome] = useState('');
  const [operacao, setOperacao] = useState('');
  const [cultura, setCultura] = useState('');
  const [tipoMarcador, setTipoMarcador] = useState<'ODOMETRO' | 'HORIMETRO' | 'SEM_MEDIDOR'>(
    'ODOMETRO',
  );
  const [leituraMarcador, setLeituraMarcador] = useState('');
  const [motivoSemMarcador, setMotivoSemMarcador] = useState('');

  // Ref for hidden validation input
  const hiddenValidationRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Clear validation error when state changes
    if (hiddenValidationRef.current) {
      hiddenValidationRef.current.setCustomValidity('');
    }
  }, [veiculoPossuiCadastro]);

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
      setVeiculoPossuiCadastro(null); // Force user selection
      setVeiculoId('');
      setVeiculoNome('');
      setOperacao('');
      setCultura('');
      setTipoMarcador('ODOMETRO');
      setLeituraMarcador('');
      setMotivoSemMarcador('');
    }
  }, [isOpen, transfer, postos]);

  // Determine Manager Mode (Exceção)
  // If the station is Virtual OR specifically named "Gerente", we flag it
  const isManagerMode = React.useMemo(() => {
    const p = postos.find(x => x.id === postoId);
    if (!p) return false;
    return p.tipo === 'VIRTUAL' || p.nome.toLowerCase().includes('gerente');
  }, [postoId, postos]);

  // Manager Reason State
  const [managerModeReason, setManagerModeReason] = useState('');
  const [managerModeDescription, setManagerModeDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        data_abastecimento: new Date(dataAbastecimento).toISOString(),
        fazenda_id: fazendaId,
        posto_id: postoId,
        veiculo_possui_cadastro: Boolean(veiculoPossuiCadastro),
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
        nuntec_operator_id: transfer['operator-id'], // Persist Original Operator ID
        nuntec_fuel_id: transfer['pointing-in']['fuel-id'],
        nuntec_reservoir_id: transfer['pointing-in']['reservoir-id'],
        nuntec_nozzle_number: transfer['pointing-in']['nozzle-number'],

        // Manager Mode Fields
        is_manager_mode: isManagerMode,
        manager_mode_reason: isManagerMode ? managerModeReason : null,
        manager_mode_description: isManagerMode && managerModeReason === 'OUTROS' ? managerModeDescription : null,
      };
      await fuelService.createAbastecimento(payload as any, user!.id);
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
              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-8">
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">
                    ID Transferência
                  </p>
                  <p className="text-sm font-menu font-bold text-amber-900 font-mono">
                    {transfer.id}
                  </p>
                </div>
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
                  <p className="text-sm font-medium text-amber-900 leading-tight">
                    {fazendaNome} - {postoNome}
                  </p>
                  {transfer['pointing-out']?.['reservoir-id'] && (
                    <p className="text-[10px] text-amber-600 font-mono mt-0.5">
                      (Reservatório ID: {transfer['pointing-out']['reservoir-id']})
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">Volume</p>
                  <p className="text-lg font-bold text-amber-900">
                    {parseFloat(volume).toFixed(2)} L
                  </p>
                  {transfer['pointing-in']?.['fuel-id'] && (
                    <p className="text-[10px] text-amber-600 font-mono mt-0.5">
                      (Fuel ID: {transfer['pointing-in']['fuel-id']})
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-amber-800 uppercase font-bold mb-1">Operador (API)</p>
                  <p className="text-sm font-medium text-amber-900 truncate" title={operador}>
                    {operador}
                  </p>
                  {transfer['operator-id'] && (
                    <p className="text-[10px] text-amber-600 font-mono mt-0.5">
                      (ID: {transfer['operator-id']})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Manager Mode Warning & Reason */}
            {isManagerMode && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-red-900">Origem: MODO GERENTE (Exceção)</h4>
                      <p className="text-xs text-red-700 mt-1">Este abastecimento foi realizado fora da automação padrão. É obrigatório justificar o motivo.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">
                          Motivo da Liberação Manual *
                        </label>
                        <select
                          required
                          value={managerModeReason}
                          onChange={(e) => setManagerModeReason(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-sm font-medium text-slate-700 outline-none"
                        >
                          <option value="">Selecione o motivo...</option>
                          <option value="ERRO_LEITURA">Erro de Leitura (Tag não funcionou)</option>
                          <option value="SEM_TAG">Veículo/Máquina sem Tag (Novo)</option>
                          <option value="TERCEIRO">Veículo de Terceiro/Alugado</option>
                          <option value="MANUTENCAO">Manutenção/Teste de Bomba</option>
                          <option value="OUTROS">Outro (Justificar)</option>
                        </select>
                      </div>

                      {managerModeReason === 'OUTROS' && (
                        <div className="animate-in fade-in slide-in-from-left-2">
                          <label className="block text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">
                            Justificativa (Obrigatório) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Descreva o motivo..."
                            value={managerModeDescription}
                            onChange={(e) => setManagerModeDescription(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-sm outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Identificação do Veículo
                </h3>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4 relative">
                    <label className="text-sm font-medium text-slate-700 block">
                      Veículo Possui Cadastro? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(true)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${veiculoPossuiCadastro === true ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(false)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${veiculoPossuiCadastro === false ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        NÃO
                      </button>
                    </div>
                    {/* Native Validation Helper */}
                    <input
                      ref={hiddenValidationRef}
                      type="text"
                      required
                      value={veiculoPossuiCadastro === null ? '' : 'ok'}
                      className="absolute opacity-0 w-1 h-1 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                      onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Por favor, informe se o veículo possui cadastro.')}
                      onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>

                  {veiculoPossuiCadastro === null ? (
                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Por favor, informe se o veículo possui cadastro.
                    </div>
                  ) : veiculoPossuiCadastro ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Selecione o Veículo *
                      </label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            placeholder="Buscar placa, frota ou modelo..."
                            value={vehicleSearchTerm}
                            required={veiculoPossuiCadastro === true && !veiculoId} // Force native "Fill this field" if empty
                            onChange={(e) => {
                              setVehicleSearchTerm(e.target.value);
                              setIsVehicleSearchOpen(true);
                              if (e.target.value === '') {
                                setVeiculoId(''); // Clear selection if cleared
                              }
                            }}
                            onFocus={() => setIsVehicleSearchOpen(true)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                          />
                          {veiculoId && (
                            <button
                              type="button"
                              onClick={() => {
                                setVeiculoId('');
                                setVehicleSearchTerm('');
                                setIsVehicleSearchOpen(true);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {isVehicleSearchOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {veiculosLista
                              .filter(v =>
                                v.identificacao.toLowerCase().includes(vehicleSearchTerm.toLowerCase())
                              )
                              .map(v => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setVeiculoId(v.id);
                                    setVeiculoNome(v.identificacao);
                                    setVehicleSearchTerm(v.identificacao);
                                    setIsVehicleSearchOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-0 border-slate-50 transition-colors flex items-center justify-between group"
                                >
                                  <span className="font-medium text-slate-700 group-hover:text-blue-700">{v.identificacao}</span>
                                  {veiculoId === v.id && <CheckCircle size={14} className="text-blue-600" />}
                                </button>
                              ))}
                            {veiculosLista.filter(v => v.identificacao.toLowerCase().includes(vehicleSearchTerm.toLowerCase())).length === 0 && (
                              <div className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                Nenhum veículo encontrado
                              </div>
                            )}
                          </div>
                        )}

                        {/* Overlay to close on click outside */}
                        {isVehicleSearchOpen && (
                          <div
                            className="fixed inset-0 z-0"
                            onClick={() => setIsVehicleSearchOpen(false)}
                          />
                        )}
                      </div>
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
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${tipoMarcador === type
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
                      <option value="NAO_POSSUI">Não Possui</option>
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
          </div >

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
        </form >
      </div >
    </div >
  );
}
