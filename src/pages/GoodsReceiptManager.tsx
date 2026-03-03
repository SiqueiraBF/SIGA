import { useState } from 'react';
import { Package, Truck, Plus, Settings as SettingsIcon, PackageX, BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { GoodsReceiptEntry } from './GoodsReceiptEntry';
import { GoodsReceiptExit } from './GoodsReceiptExit';
import { GoodsReceiptFormModal } from '../components/goods-receipt/GoodsReceiptFormModal';
import { GoodsReceiptDispatchModal } from '../components/goods-receipt/GoodsReceiptDispatchModal';
import { LogisticsDashboard } from '../components/goods-receipt/LogisticsDashboard';
import { GoodsReceipt } from '../types';
import { useAuth } from '../context/AuthContext';
import { GoodsReceiptEmailSettingsModal } from '../components/goods-receipt/GoodsReceiptEmailSettingsModal';

export function GoodsReceiptManager() {
    const { user, role, hasPermission, checkAccess } = useAuth();
    const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'dashboard'>('entry');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

    // Refresh triggers to reload data in children
    const [entryRefreshTrigger, setEntryRefreshTrigger] = useState(0);
    const [exitRefreshTrigger, setExitRefreshTrigger] = useState(0);

    const handleEntrySuccess = () => {
        setEntryRefreshTrigger(prev => prev + 1);
    };

    const handleExitSuccess = () => {
        setExitRefreshTrigger(prev => prev + 1);
        // Also refresh entry list because status changes
        setEntryRefreshTrigger(prev => prev + 1);
    };

    const handleEditEntry = (receipt: GoodsReceipt) => {
        setSelectedReceipt(receipt);
        setIsEntryModalOpen(true);
    };

    const handleOpenNewEntry = () => {
        setSelectedReceipt(null);
        setIsEntryModalOpen(true);
    };

    const handleCloseEntryModal = () => {
        setIsEntryModalOpen(false);
        setSelectedReceipt(null);
    };

    if (!hasPermission('gestao_recebimento')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <PackageX className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar o Controle de Expedição e Recebimento.</p>
                </div>
            </div>
        );
    }
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const canEditAll = isAdmin || role?.permissoes?.gestao_recebimento?.edit_scope === 'ALL';
    const canEditOwn = canEditAll || role?.permissoes?.gestao_recebimento?.edit_scope === 'OWN_ONLY';
    const canEdit = canEditOwn;

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Controle de Expedição e Recebimento"
                subtitle="Gerencie o fluxo de entrada e saída de mercadorias do CD."
                icon={activeTab === 'entry' ? Package : activeTab === 'exit' ? Truck : BarChart3}
            >
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                    {(isAdmin || role?.permissoes?.gestao_recebimento?.manage_notifications) && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-all shadow-sm order-last sm:order-first"
                            title="Configurar Notificações"
                        >
                            <SettingsIcon size={20} />
                        </button>
                    )}
                    {canEdit && (
                        <>
                            <button
                                onClick={handleOpenNewEntry}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm w-full sm:w-auto"
                            >
                                <Plus size={18} />
                                Novo Recebimento
                            </button>
                            <button
                                onClick={() => setIsExitModalOpen(true)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 text-sm w-full sm:w-auto"
                            >
                                <Plus size={18} />
                                Nova Saída
                            </button>
                        </>
                    )}
                </div>
            </PageHeader>

            <div className="border-b border-slate-200 overflow-x-auto scrollbar-hide">
                <div className="flex gap-8 min-w-max px-1">
                    <button
                        onClick={() => setActiveTab('entry')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'entry'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Package size={16} />
                        Recebimento (Entrada)
                    </button>
                    <button
                        onClick={() => setActiveTab('exit')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'exit'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Truck size={16} />
                        Expedição (Saída)
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'dashboard'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Indicadores (Dashboard)
                    </button>
                </div>
            </div>

            {/* Modals are always rendered but hidden until needed */}
            <GoodsReceiptFormModal
                isOpen={isEntryModalOpen}
                onClose={handleCloseEntryModal}
                onSuccess={handleEntrySuccess}
                initialData={selectedReceipt}
            />

            <GoodsReceiptDispatchModal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                onSuccess={handleExitSuccess}
            />

            <div className="mt-6">
                {/* 
                   We could mount/unmount or just hide. 
                   Mounting/Unmounting ensures fresh state but loses scroll position.
                   Let's use conditional rendering for now as it's simpler.
                */}
                {activeTab === 'entry' && (
                    <GoodsReceiptEntry
                        embedded
                        refreshTrigger={entryRefreshTrigger}
                        onEdit={handleEditEntry}
                    />
                )}
                {activeTab === 'exit' && (
                    <GoodsReceiptExit embedded refreshTrigger={exitRefreshTrigger} />
                )}
                {activeTab === 'dashboard' && (
                    <LogisticsDashboard />
                )}
            </div>
            {isSettingsOpen && (
                <GoodsReceiptEmailSettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    );
}
