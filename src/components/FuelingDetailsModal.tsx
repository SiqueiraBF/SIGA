import React from 'react';
import { Truck, Calendar, User, Gauge, Activity, Sprout, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Abastecimento } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface FuelingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (nuntecId?: string) => void;
  data?: Abastecimento;
}

export function FuelingDetailsModal({
  isOpen,
  onClose,
  onConfirm,
  data,
}: FuelingDetailsModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title="Detalhes do Lançamento"
          subtitle={
            <span className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">
                #{data.numero}
              </span>
              <span className="text-slate-400">•</span>
              {format(parseISO(data.data_abastecimento), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </span>
          }
          onClose={onClose}
        />

        {/* Compliance Alerts */}
        {(data.is_manager_mode || data.tipo_marcador === 'SEM_MEDIDOR') && (
          <div className="px-6 pt-6 -mb-4 space-y-2">

            {/* Manager Mode Alert */}
            {data.is_manager_mode && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wide">
                    Atenção: Modo Gerente (Exceção)
                  </p>
                  <p className="text-sm text-red-700 font-medium">
                    Motivo: <span className="font-bold">{data.manager_mode_reason}</span>
                    {data.manager_mode_reason === 'OUTROS' && data.manager_mode_description && (
                      <span className="font-normal italic ml-1">- "{data.manager_mode_description}"</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* No Meter Alert */}
            {data.tipo_marcador === 'SEM_MEDIDOR' && (
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    Registro Sem Medidor
                  </p>
                  <p className="text-sm text-amber-700 font-medium">
                    Motivo: <span className="font-bold">{data.motivo_sem_marcador === 'NAO_POSSUI' ? 'Não Possui Equipamento' : data.motivo_sem_marcador}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Header Summary Box (Similar to Nuntec Resolution) */}
          <div className={`rounded-xl p-5 border shadow-sm ${data.status === 'PENDENTE'
            ? 'bg-amber-50 border-amber-100'
            : 'bg-green-50 border-green-100'
            }`}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-8">
              <div>
                <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${data.status === 'PENDENTE' ? 'text-amber-700' : 'text-green-700'
                  }`}>ID Nuntec</p>
                <p className="text-sm font-bold text-slate-800 font-mono">
                  {data.nuntec_generated_id || '-'}
                </p>
                {data.nuntec_transfer_id && (
                  <p className="text-[10px] text-slate-500 font-mono mt-1" title="ID da Transferência (Origem)">
                    Transf: {data.nuntec_transfer_id}
                  </p>
                )}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${data.status === 'PENDENTE' ? 'text-amber-700' : 'text-green-700'
                  }`}>Data Transferência</p>
                <p className="text-sm font-semibold text-slate-800">
                  {format(parseISO(data.data_abastecimento), "dd/MM/yyyy, HH:mm")}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${data.status === 'PENDENTE' ? 'text-amber-700' : 'text-green-700'
                  }`}>Origem (Posto)</p>
                <p className="text-sm font-semibold text-slate-900 leading-tight">{data.posto?.nome || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{data.fazenda?.nome}</p>
                {data.posto?.nuntec_reservoir_id && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    (Reservatório ID: {data.posto.nuntec_reservoir_id})
                  </p>
                )}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${data.status === 'PENDENTE' ? 'text-amber-700' : 'text-green-700'
                  }`}>Volume</p>
                <p className="text-lg font-bold text-slate-900">{data.volume.toFixed(2)} L</p>
                {data.nuntec_fuel_id && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5" title="ID do Combustível (Técnico)">
                    (Fuel ID: {data.nuntec_fuel_id})
                  </p>
                )}
                {!data.nuntec_fuel_id && data.nuntec_transfer_id && onConfirm && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('Tentar buscar IDs técnicos (FuelID, etc) novamente na Nuntec?')) return;
                      try {
                        const { nuntecService } = await import('../services/nuntecService');
                        const fixed = await nuntecService.repairFuelingData(data.id, data.nuntec_transfer_id!);
                        if (fixed) {
                          alert('Dados atualizados com sucesso! O modal será fechado para recarregar.');
                          onClose();
                        } else {
                          alert('A Nuntec não retornou dados novos para esta transferência.');
                        }
                      } catch (err: any) {
                        alert('Erro ao reparar: ' + err.message);
                      }
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer mt-1 flex items-center gap-1"
                  >
                    🔄 Reparar Dados
                  </button>
                )}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${data.status === 'PENDENTE' ? 'text-amber-700' : 'text-green-700'
                  }`}>Operador</p>
                <p className="text-sm font-semibold text-slate-900">{data.operador || 'N/A'}</p>
                {data.nuntec_operator_id && (
                  <p className={`text-[10px] font-mono mt-0.5 ${data.status === 'PENDENTE' ? 'text-amber-600' : 'text-green-600'}`}>
                    (ID: {data.nuntec_operator_id})
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Vehicle & Reading */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase border-b border-slate-100 pb-2">
                <Truck size={14} /> Identificação do Veículo
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Veículo Selecionado</p>
                  <p className="text-sm font-bold text-slate-700">{data.veiculo_nome || `ID: ${data.veiculo_id}`}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                    Leitura Atual ({data.tipo_marcador === 'ODOMETRO' ? 'KM' : 'HORAS'})
                  </p>
                  <p className="text-lg font-bold text-slate-800 font-mono">
                    {data.tipo_marcador === 'SEM_MEDIDOR' ? (
                      <span className="text-red-500 text-sm font-sans italic">{data.motivo_sem_marcador}</span>
                    ) : (
                      data.leitura_marcador
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Service Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase border-b border-slate-100 pb-2">
                <Activity size={14} /> Detalhes do Serviço
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Operação</label>
                  <div className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                    {data.operacao || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Cultura</label>
                  <div className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                    {data.cultura || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="pt-4 border-t border-slate-100 mt-4 text-center space-y-1">
            <p className="text-xs text-slate-400">
              Lançado por <span className="font-semibold text-slate-600">{data.usuario?.nome || 'Sistema'}</span>
            </p>

          </div>
        </div>

        {/* Footer */}
        <ModalFooter
          className={data.status === 'PENDENTE' && onConfirm ? 'flex-col !items-stretch gap-2' : ''}
        >
          {data.status === 'PENDENTE' && onConfirm ? (
            <div className="w-full space-y-3">
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      'Confirma o envio desta baixa para a Nuntec?\nCertifique-se que o Veículo, Operação e Cultura estão corretos.',
                    )
                  ) {
                    try {
                      // The service handles defaults. In a full implementation we should fetch/store these.
                      const newId = await import('../services/nuntecService').then(m => m.nuntecService.createFueling(data));

                      alert(`✅ Sucesso! Baixa enviada para Nuntec.\nID Gerado: ${newId}`);
                      onConfirm(newId);
                      onClose();
                    } catch (error: any) {
                      alert('Erro na integração Nuntec:\n' + error.message);
                    }
                  }
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <CheckCircle2 size={24} />
                CONFIRMAR BAIXA (INTEGRADO)
              </button>
              <p className="text-center text-[10px] text-slate-400 px-4">
                O comando será enviado diretamente para a API Nuntec.
              </p>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Fechar
            </button>
          )}
        </ModalFooter>
      </div>
    </div>
  );
}
