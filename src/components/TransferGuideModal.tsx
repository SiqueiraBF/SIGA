import React from 'react';
import {
    X,
    ArrowRightLeft,
    ShoppingCart,
    Store,
    PackageCheck,
    Truck,
    AlertCircle
} from 'lucide-react';

interface TransferGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TransferGuideModal({ isOpen, onClose }: TransferGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft className="text-blue-600" />
                        Guia: Transferência de Estoque (Matriz ➔ Filial)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Intro Box */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-blue-800 text-sm">
                            Este guia descreve o fluxo padrão para que as fazendas (filiais) solicitem materiais e peças que estão disponíveis no estoque central da Matriz.
                        </p>
                    </div>

                    {/* Passo 1 - Solicitação */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Solicitação da Filial
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-4 items-start">
                            <ShoppingCart className="text-orange-500 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="font-bold text-slate-700 mb-1">Criar Requisição</h4>
                                <p className="text-slate-600 text-sm">A fazenda acessa o sistema e solicita os itens necessários. Importante: A lista de produtos exibe <strong>apenas o que consta no estoque da Matriz</strong>.</p>
                            </div>
                        </div>
                    </section>

                    {/* Passo 2 - Processamento na Matriz */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            Processamento na Matriz
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Store size={16} className="text-blue-600" /> Recebimento do Pedido</h4>
                                <p className="text-slate-600 text-sm">A equipe da Matriz recebe a notificação da solicitação pendente no painel de controle.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><PackageCheck size={16} className="text-green-600" /> Separação</h4>
                                <p className="text-slate-600 text-sm">Um responsável na Matriz localiza os itens, realiza a separação física e confirma a quantidade no sistema.</p>
                            </div>
                        </div>
                    </section>

                    {/* Passo 3 - Envio */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            Envio e Transporte
                        </h3>
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                            <p className="text-green-800 text-sm flex items-center gap-2">
                                <Truck size={18} />
                                <strong>Despacho:</strong> Assim que separado, o material é enviado para a fazenda solicitante através do transporte disponível (malote, caminhão, etc).
                            </p>
                        </div>

                        <div className="mt-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-slate-500" /> Observação Importante</h4>
                            <p className="text-slate-600 text-sm">
                                Caso o item não esteja disponível no estoque da Matriz, ele não aparecerá para solicitação. Nesse caso, deve-se proceder com um <strong>Pedido de Compra</strong> convencional.
                            </p>
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
