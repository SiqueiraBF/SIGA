import React from 'react';
import { X, Printer } from 'lucide-react';
import { LatePayment } from '../../services/latePaymentService';

interface LatePaymentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: LatePayment | null;
}

export function LatePaymentPrintModal({ isOpen, onClose, payment }: LatePaymentPrintModalProps) {
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
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
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
            <h1 className="text-2xl font-black uppercase tracking-tight">Registro de Pagamento (Atraso)</h1>
            <h2 className="text-lg font-bold text-gray-600 uppercase">Documento com Juros / Desconto</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-500 uppercase">ID Lançamento</p>
            <p className="text-lg font-black font-mono">{payment.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* Dados Principais */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm border-b border-gray-300 pb-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Empresa (Unidade)</p>
            <p className="font-bold text-lg">{payment.company}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Fornecedor / Cliente</p>
            <p className="font-bold text-lg uppercase">{payment.supplier_client}</p>
            <p className="text-xs text-gray-500">{payment.cpf_cnpj}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Tipo e Nº Documento</p>
            <p className="font-bold uppercase">{payment.document_type || 'N/A'} - Nº {payment.document_number}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Responsável pelo Lançamento</p>
            <p className="font-bold uppercase">{payment.responsible}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Data do Lançamento</p>
            <p className="font-bold">{new Date(payment.created_at).toLocaleDateString('pt-BR')} às {new Date(payment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-gray-50 border border-gray-300 p-4 rounded-xl mb-6 flex justify-between items-center print:bg-transparent print:border-2">
          <div className="text-center w-1/4 border-r border-gray-300">
            <p className="text-xs font-bold text-gray-500 uppercase">Venc. Original</p>
            <p className="font-bold text-lg">{payment.due_date ? new Date(payment.due_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>
          <div className="text-center w-1/4 border-r border-gray-300">
            <p className="text-xs font-bold text-gray-500 uppercase">Data de Pgto</p>
            <p className="font-bold text-lg">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>
          <div className="text-center w-1/4 border-r border-gray-300">
            <p className="text-xs font-bold text-gray-500 uppercase">{payment.adjustment_type === 'JUROS' ? 'Juros (+)' : 'Desconto (-)'}</p>
            <p className={`font-bold text-lg ${payment.adjustment_type === 'JUROS' ? 'text-red-700' : 'text-emerald-700'} print:text-black`}>
              R$ {Number(payment.adjustment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center w-1/4">
            <p className="text-xs font-bold text-gray-500 uppercase">Valor Final</p>
            <p className="font-black text-2xl">R$ {Number(payment.final_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 line-through">Orig: R$ {Number(payment.original_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Justificativa e Motivo */}
        <div className="space-y-4 mb-8">
          {(payment.motivo || payment.justification) && (
            <>
              {payment.motivo && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Motivo do Atraso</p>
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 print:bg-transparent font-bold">
                    {payment.motivo}
                  </div>
                </div>
              )}
              
              {payment.justification && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Justificativa Detalhada</p>
                  <div className="p-3 border border-gray-300 rounded-lg min-h-[80px] bg-white text-sm whitespace-pre-wrap">
                    {payment.justification}
                  </div>
                </div>
              )}
            </>
          )}

          {payment.action_plan && (
            <div>
              {actionPlanData ? (
                <div className="border-2 border-teal-800 rounded-lg overflow-hidden">
                  <div className="bg-teal-800 text-white p-2 text-center">
                    <h3 className="font-bold uppercase text-sm">Plano de Ação de Melhoria Contínua</h3>
                    <p className="text-xs text-teal-100">Como / Quem / Quando</p>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-200 text-gray-700">
                      <tr>
                        <th className="p-2 border-b border-r border-gray-300 font-bold w-1/4">Quando? (Data Limite)</th>
                        <th className="p-2 border-b border-r border-gray-300 font-bold w-2/4">Como? (Ação)</th>
                        <th className="p-2 border-b border-gray-300 font-bold w-1/4">Quem? (Responsável)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border-r border-gray-300 font-medium">
                          {actionPlanData.quando ? new Date(actionPlanData.quando + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
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
                    Plano de Ação
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
              <p className="font-bold text-sm uppercase">Diretor Geral (Iberê)</p>
              <p className="text-xs text-gray-500">Visto Final</p>
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
