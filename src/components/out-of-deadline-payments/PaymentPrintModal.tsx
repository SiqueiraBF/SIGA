import React, { useRef } from 'react';
import { X, Printer, Calendar } from 'lucide-react';
import { OutOfDeadlinePayment } from '../../services/outOfDeadlinePaymentService';

interface PaymentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: OutOfDeadlinePayment | null;
}

const formatLocalDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export function PaymentPrintModal({ isOpen, onClose, payment }: PaymentPrintModalProps) {
  if (!isOpen || !payment) return null;

  const getParsedActionPlan = () => {
    if (!payment?.action_plan) return null;
    try {
      const parsed = JSON.parse(payment.action_plan);
      if (parsed.quando || parsed.como || parsed.quem) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const actionPlanData = getParsedActionPlan();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none animate-in fade-in duration-300">
      
      {/* Botões visíveis apenas na tela */}
      <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10">
        <button 
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <Printer size={18} />
          Imprimir
        </button>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl backdrop-blur-md transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Papel A4 */}
      <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-[15mm] md:p-[20mm] print:shadow-none print:w-full print:max-w-none print:h-auto print:min-h-0 relative overflow-y-auto max-h-[90vh] print:max-h-none print:overflow-visible mx-auto text-black">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Autorização de Pagamento</h1>
            <h2 className="text-lg font-bold text-gray-600 uppercase">Fora do Prazo Programado</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-500 uppercase">ID Lançamento</p>
            <p className="text-lg font-black font-mono">{payment.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* Dados Principais */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6 text-sm border-b border-gray-300 pb-6">
          <div className="col-span-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Unidade (Fazenda)</p>
            <p className="font-bold text-lg">{payment.fazenda?.nome || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold text-gray-500 uppercase">Fornecedor</p>
            <p className="font-bold text-lg uppercase">{payment.fornecedor}</p>
          </div>
          <div className="col-span-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Tipo e Nº Documento</p>
            <p className="font-bold uppercase">{payment.tipo_doc} - Nº {payment.n_doc}</p>
          </div>
          <div className="col-span-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Responsável</p>
            <p className="font-bold uppercase">{payment.responsavel || 'N/A'}</p>
          </div>
          <div className="col-span-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Data do Lançamento</p>
            <p className="font-bold">{new Date(payment.created_at).toLocaleDateString('pt-BR')} às {new Date(payment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="col-span-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Responsável pelo Lançamento</p>
            <p className="font-bold uppercase">{payment.usuario?.nome || 'N/A'} (Setor: {payment.setor})</p>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-gray-50 border border-gray-300 p-4 rounded-xl mb-6 flex justify-between items-center print:bg-transparent print:border-2">
          <div className="text-center w-1/3 border-r border-gray-300">
            <p className="text-xs font-bold text-gray-500 uppercase">Vencimento Original</p>
            <p className="font-bold text-lg">{formatLocalDate(payment.data_vencimento)}</p>
          </div>
          <div className="text-center w-1/3 border-r border-gray-300">
            <p className="text-xs font-bold text-gray-500 uppercase">Programado para Pagamento</p>
            <p className="font-bold text-lg">{formatLocalDate(payment.data_pgto)}</p>
          </div>
          <div className="text-center w-1/3">
            <p className="text-xs font-bold text-gray-500 uppercase">Valor a Pagar</p>
            <p className="font-black text-2xl">R$ {Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Justificativa e Motivo */}
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Motivo do Atraso</p>
            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 print:bg-transparent font-bold">
              {payment.motivo}
            </div>
          </div>
          
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Justificativa Detalhada</p>
            <div className="p-3 border border-gray-300 rounded-lg min-h-[80px] bg-white text-sm whitespace-pre-wrap">
              {payment.justificativa}
            </div>
          </div>

          {payment.action_plan && (
            <div>
              {actionPlanData ? (
                <div className="border-2 border-teal-800 rounded-lg overflow-hidden">
                  <div className="bg-teal-800 text-white p-2 text-center">
                    <h3 className="font-bold uppercase text-sm">Plano de Mitigação</h3>
                    <p className="text-xs text-teal-100">Quais ações serão tomadas para evitar nova solicitação de abertura de período</p>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-200 text-gray-700">
                      <tr>
                        <th className="p-2 border-b border-r border-gray-300 font-bold w-1/4">Quando? (Data)</th>
                        <th className="p-2 border-b border-r border-gray-300 font-bold w-2/4">Como? (Ação)</th>
                        <th className="p-2 border-b border-gray-300 font-bold w-1/4">Quem? (Responsável)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border-r border-gray-300 font-medium">
                          {actionPlanData.quando ? formatLocalDate(actionPlanData.quando) : '-'}
                        </td>
                        <td className="p-2 border-r border-gray-300">{actionPlanData.como || '-'}</td>
                        <td className="p-2 font-medium">{actionPlanData.quem || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-gray-800 uppercase mb-1 flex items-center gap-1">
                    Plano de Ação para evitar reincidência
                  </p>
                  <div className="p-3 border-2 border-gray-800 rounded-lg min-h-[80px] bg-white text-sm whitespace-pre-wrap font-medium">
                    {payment.action_plan}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Assinaturas */}
        <div className="mt-16 pt-8">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center space-y-2">
              <div className="border-b-2 border-black w-full h-8 mb-2"></div>
              <p className="font-bold text-sm uppercase">Gestor Direto</p>
              <p className="text-xs text-gray-500">Assinatura / Visto</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="border-b-2 border-black w-full h-8 mb-2"></div>
              <p className="font-bold text-sm uppercase">DIRETOR</p>
              <p className="text-xs text-gray-500">Autorização Final</p>
            </div>
          </div>
        </div>
        
        {/* Footer print */}
        <div className="absolute bottom-[10mm] left-[15mm] right-[15mm] text-center text-[10px] text-gray-400 border-t border-gray-200 pt-2 print:block">
          SIGA - Sistema de Gestão Integrada • Impresso em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
