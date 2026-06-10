import React, { useState } from 'react';
import { db } from '../../../services/supabaseService';
import { Sparkles } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { ModalHeader } from '../../ui/ModalHeader';
import { FormField } from '../../ui/FormField';
import { Textarea } from '../../ui/Textarea';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';
import toast from 'react-hot-toast';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimulatorModal({ isOpen, onClose }: SimulatorModalProps) {
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = async () => {
    if (!simulatorInput.trim()) return;
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const result = await db.analyzePdmItem({ 
          id: '00000000-0000-0000-0000-000000000000',
          descricao: simulatorInput.trim(),
          marca: '',
          referencia: '',
          unidade: 'UN'
      }, true);
      if(result && result.result) {
         setSimulationResult(result.result);
      } else {
         throw new Error("Resposta inválida da IA");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      setSimulationResult({ status: 'ERRO', message: err.message, descricao_padronizada: '-' });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Playground da IA" icon={Sparkles} onClose={onClose} iconClassName="text-blue-600" />
      
      <div className="p-6 flex flex-col gap-5">
           <FormField label="Descrição Bruta de Teste" hint="Como o solicitante digitaria.">
              <Textarea 
                 placeholder="Ex: PNEU MICHELIN 295 BORRACHUDO..." 
                 value={simulatorInput}
                 onChange={e => setSimulatorInput(e.target.value)}
                 rows={3}
              />
           </FormField>
           <Button 
             variant="primary" 
             icon={Sparkles} 
             onClick={handleSimulate} 
             isLoading={isSimulating} 
             className="w-full bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
           >
             Simular Análise
           </Button>

           {isSimulating && (
               <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm mt-2">
                  <div className="absolute inset-0 bg-blue-400/5 animate-pulse" />
                  <div className="relative flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-blue-100">
                          <Sparkles className="animate-pulse text-blue-500" size={20} />
                      </div>
                      <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-widest">IA Analisando Padrão PDM</span>
                              <span className="animate-ping w-1.5 h-3.5 bg-blue-500 inline-block" />
                          </div>
                          <div className="space-y-1.5">
                              <div className="h-1.5 w-3/4 rounded-full bg-blue-200/60 animate-pulse" />
                              <div className="h-1.5 w-1/2 rounded-full bg-blue-200/40 animate-pulse delay-75" />
                          </div>
                      </div>
                  </div>
              </div>
           )}

           {simulationResult && !isSimulating && (
               <div className="mt-2 flex flex-col gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2">Resultado da Análise:</span>
                   
                   {/* Status */}
                   <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">Status Atribuído:</span>
                      <StatusBadge status={(simulationResult.status || '').toUpperCase()} />
                   </div>

                   {/* Conceito PDM */}
                   <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600">Conceito PDM Padrão:</span>
                      <div className="bg-white border border-slate-200 rounded-md p-3 font-mono text-[12px] font-bold text-blue-900 break-words shadow-sm">
                          {simulationResult.descricao_padronizada || '-'}
                      </div>
                   </div>

                   {/* Mensagem */}
                   <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600">Mensagem da Inteligência Artificial:</span>
                      <div className="bg-white border border-slate-200 rounded-md p-3 text-[12px] text-slate-700 italic border-l-2 border-l-amber-400 shadow-sm leading-relaxed">
                          {simulationResult.message || '-'}
                      </div>
                   </div>
               </div>
           )}
      </div>
    </Modal>
  );
}
