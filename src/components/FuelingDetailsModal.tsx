import React from 'react';
import { Truck, Calendar, User, Gauge, Activity, Sprout, CheckCircle2 } from 'lucide-react';
import type { Abastecimento } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// UI Kit
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface FuelingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
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

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span
              className={`px-4 py-1.5 text-xs font-bold rounded-full uppercase border tracking-wider ${
                data.status === 'PENDENTE'
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-green-100 text-green-700 border-green-200'
              }`}
            >
              {data.status === 'PENDENTE' ? '⏳ Pendente de Baixa' : '✅ Baixado / Concluído'}
            </span>
          </div>

          {/* Metadata: User Launched */}
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg justify-center border border-slate-100">
            <User size={14} />
            <span>
              Lançado por:{' '}
              <span className="font-semibold text-slate-700">
                {data.usuario?.nome || 'Sistema'}
              </span>
            </span>
          </div>

          {/* Main Highlight: Volume */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Volume Abastecido
            </p>
            <div className="text-5xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-1">
              {data.volume.toFixed(2)}{' '}
              <span className="text-xl text-slate-400 font-medium self-end mb-2">L</span>
            </div>
          </div>

          {/* Critical Info for Nuntec (Highlighted) */}
          <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-blue-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] text-blue-500 uppercase font-bold tracking-wide">
                  Operador (Responsável)
                </p>
                <p className="text-lg font-bold text-slate-800 leading-tight">{data.operador}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase mb-1">
                  <Activity size={12} /> Operação
                </p>
                <p className="font-bold text-slate-700 bg-white/50 px-2 py-1 rounded border border-blue-100/50 text-sm">
                  {data.operacao}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase mb-1">
                  <Sprout size={12} /> Cultura
                </p>
                <p className="font-bold text-slate-700 bg-white/50 px-2 py-1 rounded border border-blue-100/50 text-sm">
                  {data.cultura}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Info (Vehicle + Markers) */}
          <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-100">
            {/* Column 1: Vehicle & Origin */}
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                  <Truck size={12} /> Veículo
                </p>
                <p className="font-bold text-slate-700 leading-tight text-base">
                  {data.veiculo_nome || `ID: ${data.veiculo_id}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Origem</p>
                <p className="font-semibold text-slate-700 text-sm">{data.fazenda?.nome}</p>
                <p className="text-slate-500 text-xs">{data.posto?.nome}</p>
              </div>
            </div>

            {/* Column 2: Odometer Reading */}
            <div className="space-y-1 bg-slate-50 rounded-xl p-3 h-fit border border-slate-100">
              <p className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase mb-1">
                <Gauge size={12} /> Leitura ({data.tipo_marcador === 'ODOMETRO' ? 'KM' : 'HORAS'})
              </p>
              <p className="text-xl font-mono font-bold text-slate-800 tracking-tight">
                {data.tipo_marcador === 'SEM_MEDIDOR' ? (
                  <span className="text-red-500 text-xs font-sans italic">
                    {data.motivo_sem_marcador}
                  </span>
                ) : (
                  data.leitura_marcador
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <ModalFooter
          className={data.status === 'PENDENTE' && onConfirm ? 'flex-col !items-stretch gap-2' : ''}
        >
          {data.status === 'PENDENTE' && onConfirm ? (
            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Verificou os dados? Confirma que o lançamento foi realizado na Nuntec?',
                    )
                  ) {
                    onConfirm();
                    onClose();
                  }
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <CheckCircle2 size={24} />
                CONFIRMAR BAIXA
              </button>
              <p className="text-center text-[10px] text-slate-400 px-4">
                Certifique-se de ter lançado Operador e Cultura no Nuntec antes de confirmar.
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
