import React from 'react';
import {
    X,
    Scale,
    Truck,
    FlaskConical,
    FileText,
    CheckCircle2,
    Camera,
    ClipboardList,
    AlertTriangle
} from 'lucide-react';

interface ReceiptGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ReceiptGuideModal({ isOpen, onClose }: ReceiptGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-purple-600" />
                        Guia: Procedimento de Recebimento
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Intro Box */}
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                        <p className="text-purple-800 text-sm">
                            Este guia descreve o procedimento padrão para descarga de combustível, garantindo a conformidade entre a Nota Fiscal e o volume físico recebido.
                        </p>
                    </div>

                    {/* Passo 1 - Chegada */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Chegada e Pesagem Inicial
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-4 items-start">
                            <Scale className="text-blue-600 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="font-bold text-slate-700 mb-1">Pesagem de Entrada</h4>
                                <p className="text-slate-600 text-sm">Assim que o caminhão chegar à unidade, realize a primeira pesagem na balança (Peso Bruto).</p>
                            </div>
                        </div>
                    </section>

                    {/* Passo 2 - Descarregamento */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            Descarregamento e Re-pesagem
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Truck size={16} className="text-slate-500" /> Descarga Parcial</h4>
                                <p className="text-slate-600 text-sm">Caso o caminhão possua mais de uma Nota Fiscal (NF), descarregue a primeira nota completamente.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Scale size={16} className="text-blue-500" /> Nova Pesagem</h4>
                                <p className="text-slate-600 text-sm">Realize uma nova pesagem antes de iniciar o descarregamento da próxima nota.</p>
                            </div>
                        </div>
                    </section>

                    {/* Passo 3 - Análise */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            Análise Técnica do Diesel
                        </h3>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                            <p className="text-blue-800 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} />
                                <strong>Obrigatório:</strong> Realize a análise visual e técnica antes ou durante cada descarga.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                                <strong className="text-green-700 block text-sm mb-1 flex items-center gap-2"><CheckCircle2 size={16} /> Aspecto Visual</strong>
                                <span className="text-xs text-green-800">Verifique a coloração, brilho e se há presença de sujeira, água ou borra.</span>
                            </div>
                            <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
                                <strong className="text-purple-700 block text-sm mb-1 flex items-center gap-2"><FlaskConical size={16} /> Físico-Químico</strong>
                                <span className="text-xs text-purple-800">Meça a <strong>temperatura</strong> e a <strong>densidade</strong> atual (Ambiente) da amostra.</span>
                            </div>
                        </div>
                    </section>

                    {/* Passo 4 - Evidências */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                            Registro e Envio de Evidências
                        </h3>
                        <p className="text-slate-600 text-sm">Após a análise, envie para o suporte os seguintes dados para lançamento:</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center gap-2">
                                <Camera className="text-slate-400" size={24} />
                                <span className="text-sm font-bold text-slate-700">Imagens</span>
                                <span className="text-xs text-slate-500">Fotos da análise visual (proveta/frasco).</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center gap-2">
                                <ClipboardList className="text-slate-400" size={24} />
                                <span className="text-sm font-bold text-slate-700">Documentos</span>
                                <span className="text-xs text-slate-500">Foto do Ticket de pesagem e da Nota Fiscal.</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center gap-2">
                                <FileText className="text-slate-400" size={24} />
                                <span className="text-sm font-bold text-slate-700">Dados</span>
                                <span className="text-xs text-slate-500">Valores exatos de temperatura e densidade.</span>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors shadow-lg shadow-slate-200"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
