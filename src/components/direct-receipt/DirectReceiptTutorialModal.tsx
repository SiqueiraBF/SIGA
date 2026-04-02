import React from 'react';
import { X, AlertTriangle, CheckCircle2, Receipt, Users, MapPin, BarChart3, Mail } from 'lucide-react';

interface DirectReceiptTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DirectReceiptTutorialModal({ isOpen, onClose }: DirectReceiptTutorialModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="text-blue-600" />
                        Guia: Monitoramento de Fuga de Processo
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-blue-800 text-sm">
                            Este módulo serve para registrar mercadorias que chegam às unidades e seguem diretamente para uso, <strong>sem passar pela conferência do almoxarifado</strong>.
                        </p>
                    </div>

                    {/* Passo 1 */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Por que monitorar?
                        </h3>
                        <p className="text-slate-600 text-sm">
                            Quando uma nota é lançada no ERP (Unisystem), os almoxarifes recebem a tarefa de realizar o <strong>Aceite</strong>. Se a mercadoria não passou por eles, gera-se um conflito:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> O Problema</h4>
                                <p className="text-red-600 text-sm">O almoxarife é cobrado pelo aceite, mas desconhece o paradeiro físico da mercadoria.</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle2 size={16} /> A Solução</h4>
                                <p className="text-green-600 text-sm">Este registro serve como evidência de que a carga foi entregue diretamente ao requisitante.</p>
                            </div>
                        </div>
                    </section>

                    {/* Passo 2 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            Dados Essenciais do Registro
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="border border-slate-200 bg-slate-50 p-3 rounded-lg">
                                <strong className="text-slate-700 block text-sm mb-1 font-bold flex items-center gap-2"><Receipt size={14} className="text-blue-500" /> Nota Fiscal</strong>
                                <span className="text-xs text-slate-500">Número da NF ou identificador do documento de entrega.</span>
                            </div>
                            <div className="border border-slate-200 bg-slate-50 p-3 rounded-lg">
                                <strong className="text-slate-700 block text-sm mb-1 font-bold flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> Local/Setor</strong>
                                <span className="text-xs text-slate-500">Indique onde a mercadoria foi descarregada (ex: Oficina, Cantina).</span>
                            </div>
                            <div className="border border-slate-200 bg-slate-50 p-3 rounded-lg">
                                <strong className="text-slate-700 block text-sm mb-1 font-bold flex items-center gap-2"><Users size={14} className="text-blue-500" /> Responsável</strong>
                                <span className="text-xs text-slate-500">Quem solicitou ou recebeu os itens em campo.</span>
                            </div>
                        </div>
                    </section>

                    {/* Passo 3 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            Indicadores e Dashboard
                        </h3>
                        <p className="text-slate-600 text-sm">O sistema compila automaticamente os desvios de processo para análise gerencial:</p>
                        <ul className="space-y-2 text-slate-600 text-sm ml-2">
                            <li className="flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> <strong>Volume Financeiro:</strong> Valor total das notas que não passaram pelo almoxarifado.</li>
                            <li className="flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> <strong>Atraso no Registro:</strong> Diferença entre a data de emissão e o lançamento no sistema.</li>
                            <li className="flex items-center gap-2"><MapPin size={16} className="text-blue-500" /> <strong>Setores Críticos:</strong> Ranking dos locais que mais geram desvios de conferência.</li>
                        </ul>
                    </section>

                    {/* Passo 4 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                            Automação de E-mail
                        </h3>
                        <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <Mail size={24} className="text-blue-400 shrink-0" />
                            <p className="text-slate-600 text-sm">
                                Assim que os dados são registrados no sistema, um <strong>E-mail de Notificação</strong> é enviado automaticamente aos gestores com os detalhes da ocorrência para ciência imediata.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
}
