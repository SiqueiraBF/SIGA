import React from 'react';
import { X, AlertTriangle, CheckCircle2, Droplet, Camera, Beaker, Trash2 } from 'lucide-react';

interface DrainageTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DrainageTutorialModal({ isOpen, onClose }: DrainageTutorialModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Droplet className="text-blue-600" />
                        Guia: Drenagem e Análise de Tanques
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-blue-800 text-sm">
                            Este guia descreve o procedimento padrão para garantir que o combustível esteja livre de água e impurezas.
                        </p>
                    </div>

                    {/* Passo 1 */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Preparação e Segurança
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" /> Equipamentos</h4>
                                <p className="text-slate-600 text-sm">Utilize luvas nitrílicas e óculos de proteção.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Beaker size={16} className="text-blue-500" /> Recipientes</h4>
                                <p className="text-slate-600 text-sm">Tenha em mãos um balde metálico (para o expurgo) e uma proveta ou frasco de vidro limpo (para a análise).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <strong>Atenção:</strong> Certifique-se de que não há fontes de calor ou chamas próximas ao local.
                        </div>
                    </section>

                    {/* Passo 2 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            O Processo de Expurgo (Limpeza da Linha)
                        </h3>
                        <p className="text-slate-600 text-sm">Como a água e os sedimentos são mais densos, eles se acumulam no fundo do tanque.</p>
                        <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm ml-2">
                            <li>Abra a válvula de drenagem lentamente.</li>
                            <li><strong>Volume de Expurgo:</strong> Deixe fluir o líquido para o balde de descarte. Para tanques grandes, drene cerca de 10 a 12 litros.</li>
                            <li><strong>O que observar:</strong> No início, é comum sair uma mistura escura ou com água. Continue drenando até que o combustível saia com sua cor característica e sem turbidez.</li>
                        </ul>
                    </section>

                    {/* Passo 3 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            Coleta para Análise Visual
                        </h3>
                        <p className="text-slate-600 text-sm">Após limpar a linha com o expurgo, colete 1 a 2 litros no frasco de vidro transparente.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                            <div className="border border-green-200 bg-green-50 p-3 rounded-lg">
                                <strong className="text-green-700 block text-sm mb-1">✅ Aspecto Límpido</strong>
                                <span className="text-xs text-green-600">O combustível deve estar transparente e brilhante.</span>
                            </div>
                            <div className="border border-red-200 bg-red-50 p-3 rounded-lg">
                                <strong className="text-red-700 block text-sm mb-1">💧 Presença de Água</strong>
                                <span className="text-xs text-red-600">Procure por "bolinhas" no fundo do frasco ou uma divisão clara.</span>
                            </div>
                            <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg">
                                <strong className="text-amber-700 block text-sm mb-1">🌫️ Impurezas</strong>
                                <span className="text-xs text-amber-600">Pontos pretos ou "borra" flutuando ou no fundo.</span>
                            </div>
                        </div>
                    </section>

                    {/* Passo 4 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                            Registro no Sistema
                        </h3>
                        <ul className="space-y-2 text-slate-600 text-sm">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> <strong>Posto/Tanque:</strong> Selecione a fazenda e o combustível correspondente.</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> <strong>Litros Drenados:</strong> Informe o total retirado (Expurgo + Amostra).</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> <strong>Aspecto:</strong> Marque se estava limpo ou se havia presença de contaminantes.</li>
                            <li className="flex items-center gap-2"><Camera size={16} className="text-blue-500" /> <strong>Fotos:</strong> Tire uma foto do frasco de análise e uma do descarte.</li>
                        </ul>
                    </section>

                    {/* Passo 5 */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span>
                            Destino do Resíduo
                        </h3>
                        <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <Trash2 size={24} className="text-slate-400 shrink-0" />
                            <p className="text-slate-600 text-sm">
                                O material coletado no balde de expurgo deve ser levado para a <strong>caixa separadora de água e óleo (SAO)</strong> ou tambor de descarte de resíduos químicos, conforme a norma da fazenda.
                                <br /><span className="text-red-600 font-bold">Nunca descarte no solo.</span>
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
