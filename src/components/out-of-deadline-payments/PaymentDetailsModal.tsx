import React from 'react';
import { X, Printer, Trash2, Calendar, FileText, Building2, User, AlertCircle, DollarSign, ExternalLink, Paperclip } from 'lucide-react';
import { OutOfDeadlinePayment } from '../../services/outOfDeadlinePaymentService';
import { useAuth } from '../../context/AuthContext';

interface PaymentDetailsModalProps {
  payment: OutOfDeadlinePayment;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}

const formatLocalDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export function PaymentDetailsModal({ payment, isOpen, onClose, onPrint, onDelete, canDelete }: PaymentDetailsModalProps) {
  const { role } = useAuth();
  const isAdmin = role?.nome === 'Administrador';

  if (!isOpen) return null;

  let parsedActionPlan = null;
  if (payment.action_plan) {
    try {
      parsedActionPlan = JSON.parse(payment.action_plan);
    } catch (e) {
      parsedActionPlan = null;
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detalhes da Autorização</h2>
              <p className="text-sm text-slate-500">Lançamento fora do prazo - {payment.tipo_doc} Nº {payment.n_doc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl font-bold transition-colors"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            {(isAdmin || canDelete) && (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl font-bold transition-colors"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50 space-y-6">
          
          {/* Card Principal */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Fornecedor</p>
                <p className="text-lg font-bold text-slate-800">{payment.fornecedor}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={14}/> Valor Total</p>
                <p className="text-2xl font-extrabold text-teal-600">
                  R$ {Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <hr className="my-6 border-slate-100" />

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Vencimento</p>
                <p className="text-sm font-medium text-slate-500 line-through">
                  {formatLocalDate(payment.data_vencimento)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Prog. Pagamento</p>
                <p className="text-sm font-bold text-rose-600">
                  {formatLocalDate(payment.data_pgto)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Building2 size={12}/> Fazenda</p>
                <p className="text-sm font-bold text-slate-700">{payment.fazenda?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={12}/> Solicitante</p>
                <p className="text-sm font-bold text-slate-700">{payment.usuario?.nome || 'N/A'}</p>
                <p className="text-xs text-slate-500">{payment.setor}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={12}/> Responsável</p>
                <p className="text-sm font-bold text-slate-700">{payment.responsavel || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Motivo e Justificativa */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle size={16} className="text-teal-600" />
              Motivo do Atraso
            </h3>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg mb-2">
                  {payment.motivo}
                </span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{payment.justificativa}</p>
              </div>
            </div>

            {parsedActionPlan && (
              <div className="mt-4 p-5 bg-teal-50/50 border border-teal-100 rounded-xl">
                <h4 className="text-sm font-bold text-teal-800 mb-4 flex items-center gap-2">
                  Plano de Ação de Melhoria Contínua
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-teal-700/70 uppercase mb-1">Quando? (Data Limite)</p>
                    <p className="text-sm font-bold text-teal-900">
                      {formatLocalDate(parsedActionPlan.quando)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-teal-700/70 uppercase mb-1">Quem? (Responsável)</p>
                    <p className="text-sm font-bold text-teal-900">{parsedActionPlan.quem}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-700/70 uppercase mb-1">Como? (Ação)</p>
                  <p className="text-sm text-teal-900 bg-white/60 p-3 rounded-lg border border-teal-100/50">
                    {parsedActionPlan.como}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Anexos */}
          {payment.anexos && payment.anexos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Paperclip size={16} className="text-teal-600" />
                Anexos ({payment.anexos.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payment.anexos.map((url, index) => {
                  const filename = url.split('/').pop() || `Anexo ${index + 1}`;
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between p-3 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                          <FileText size={18} className="text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-700 transition-colors">
                          {decodeURIComponent(filename)}
                        </span>
                      </div>
                      <ExternalLink size={16} className="text-slate-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
