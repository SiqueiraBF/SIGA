import React, { useState, useEffect } from 'react';
import { Save, Droplet, User, MapPin, Edit2 } from 'lucide-react';
import type { Abastecimento, Fazenda, Posto, Veiculo } from '../types';
import { fuelService } from '../services/fuelService';
import { vehicleService } from '../services/vehicleService';
import { useAuth } from '../context/AuthContext';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface FuelingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Abastecimento;
  fazendas: Fazenda[];
  postos: Posto[]; // pass all, we filter inside
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

export function FuelingFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  fazendas,
  postos,
}: FuelingFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [veiculosLista, setVeiculosLista] = useState<Veiculo[]>([]);

  // Form State
  const [dataAbastecimento, setDataAbastecimento] = useState(new Date().toISOString().slice(0, 16));
  const [fazendaId, setFazendaId] = useState('');
  const [postoId, setPostoId] = useState('');

  // Veículo
  const [veiculoPossuiCadastro, setVeiculoPossuiCadastro] = useState(true);
  const [veiculoId, setVeiculoId] = useState('');
  const [veiculoNome, setVeiculoNome] = useState(''); // Text input

  // Dados
  const [volume, setVolume] = useState('');
  const [operador, setOperador] = useState('');
  const [operacao, setOperacao] = useState('');
  const [cultura, setCultura] = useState('');

  // Marcador
  const [tipoMarcador, setTipoMarcador] = useState<'ODOMETRO' | 'HORIMETRO' | 'SEM_MEDIDOR'>(
    'ODOMETRO',
  );
  const [leituraMarcador, setLeituraMarcador] = useState('');
  const [motivoSemMarcador, setMotivoSemMarcador] = useState('');

  useEffect(() => {
    if (isOpen) {
      vehicleService.getAll().then(setVeiculosLista).catch(console.error);

      if (initialData) {
        setDataAbastecimento(new Date(initialData.data_abastecimento).toISOString().slice(0, 16));
        setFazendaId(initialData.fazenda_id);
        setPostoId(initialData.posto_id);
        setVeiculoPossuiCadastro(initialData.veiculo_possui_cadastro);
        setVeiculoId(initialData.veiculo_id || '');
        setVeiculoNome(initialData.veiculo_nome || '');
        setVolume(initialData.volume.toString());
        setOperador(initialData.operador);
        setOperacao(initialData.operacao);
        setCultura(initialData.cultura);
        setTipoMarcador(initialData.tipo_marcador);
        setLeituraMarcador(initialData.leitura_marcador?.toString() || '');
        setMotivoSemMarcador(initialData.motivo_sem_marcador || '');
      } else {
        // Reset defaults
        setDataAbastecimento(new Date().toISOString().slice(0, 16));
        setFazendaId(user?.fazenda_id || '');
        setPostoId('');
        setVeiculoPossuiCadastro(true);
        setVeiculoId('');
        setVeiculoNome('');
        setVolume('');
        setOperador('');
        setOperacao('');
        setCultura('');
        setTipoMarcador('ODOMETRO');
        setLeituraMarcador('');
        setMotivoSemMarcador('');
      }
    }
  }, [isOpen, initialData]);

  // Filter postos by fazenda
  const filteredPostos = postos.filter((p) => p.fazenda_id === fazendaId && p.ativo);

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
        status: 'PENDENTE', // Default flow: Pending Confirmation
      };

      if (initialData) {
        await fuelService.updateAbastecimento(initialData.id, payload, user!.id);
      } else {
        await fuelService.createAbastecimento(payload, user!.id);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      alert(`Erro ao salvar abastecimento: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={initialData ? 'Editar Baixa de Combustível' : 'Nova Baixa de Combustível'}
          icon={initialData ? Edit2 : Droplet}
          iconClassName="text-blue-600 bg-blue-50 border-blue-100"
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Coluna Esquerda: Contexto e Veículo */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Origem e Equipamento
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fazenda *
                    </label>
                    <select
                      required
                      value={fazendaId}
                      onChange={(e) => {
                        setFazendaId(e.target.value);
                        setPostoId('');
                      }}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {fazendas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Posto de Abastecimento *
                    </label>
                    <select
                      required
                      value={postoId}
                      onChange={(e) => setPostoId(e.target.value)}
                      disabled={!fazendaId}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        {fazendaId ? 'Selecione o Posto...' : 'Selecione Fazenda...'}
                      </option>
                      {filteredPostos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700 block">
                      Veículo Possui Cadastro?
                    </label>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(true)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${veiculoPossuiCadastro ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setVeiculoPossuiCadastro(false)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!veiculoPossuiCadastro ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>

                  {veiculoPossuiCadastro ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Selecione o Veículo/Máquina *
                      </label>
                      <select
                        required={veiculoPossuiCadastro}
                        value={veiculoId}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        onChange={(e) => {
                          const val = e.target.value;
                          setVeiculoId(val);
                          const selected = veiculosLista.find((v) => v.id === val);
                          if (selected) setVeiculoNome(selected.identificacao);
                        }}
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
                        Identificação do Veículo (Manual) *
                      </label>
                      <input
                        type="text"
                        required={!veiculoPossuiCadastro}
                        value={veiculoNome}
                        onChange={(e) => setVeiculoNome(e.target.value)}
                        placeholder="Ex: Trator Alugado Placa XYZ-1234"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Medidor / Marcador *
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => setTipoMarcador('ODOMETRO')}
                      type="button"
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${tipoMarcador === 'ODOMETRO' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      KM (Odômetro)
                    </button>
                    <button
                      onClick={() => setTipoMarcador('HORIMETRO')}
                      type="button"
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${tipoMarcador === 'HORIMETRO' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      Horas (Horímetro)
                    </button>
                    <button
                      onClick={() => setTipoMarcador('SEM_MEDIDOR')}
                      type="button"
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${tipoMarcador === 'SEM_MEDIDOR' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      Sem Medidor
                    </button>
                  </div>
                  {tipoMarcador !== 'SEM_MEDIDOR' ? (
                    <input
                      type="number"
                      required
                      placeholder={`Leitura atual (${tipoMarcador === 'ODOMETRO' ? 'KM' : 'Horas'})`}
                      value={leituraMarcador}
                      onChange={(e) => setLeituraMarcador(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      required
                      value={motivoSemMarcador}
                      onChange={(e) => setMotivoSemMarcador(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecione o motivo...</option>
                      <option value="QUEBRADO">Quebrado/Defeito</option>
                      <option value="NAO_POSSUI">Não Possui</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Abastecimento e Operação */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <Droplet size={16} /> Dados do Abastecimento
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dataAbastecimento}
                    onChange={(e) => setDataAbastecimento(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <label className="block text-sm font-bold text-green-800 mb-1">
                    Volume Abastecido (Litros) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-4 pr-12 py-3 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-2xl font-bold text-green-700 bg-white outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">
                      L
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Operador / Responsável *
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      required
                      value={operador}
                      onChange={(e) => setOperador(e.target.value)}
                      placeholder="Nome do funcionário"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Operação *
                    </label>
                    <select
                      required
                      value={operacao}
                      onChange={(e) => setOperacao(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cultura *
                    </label>
                    <select
                      required
                      value={cultura}
                      onChange={(e) => setCultura(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value="">Selecione...</option>
                      {CULTURAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
              ) : (
                <Save size={20} />
              )}
              {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
}
