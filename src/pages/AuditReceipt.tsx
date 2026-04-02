import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    CheckCircle,
    Info,
    CircleHelp,
    AlertTriangle,
    FilterX,
    ShieldCheck
} from 'lucide-react';
import { AuditDetailsModal } from '../components/AuditDetailsModal';
import { ReceiptGuideModal } from '../components/ReceiptGuideModal';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { AuditRow } from '../components/audit/AuditRow';
import { AuditStatsCards } from '../components/audit/AuditStatsCards';
import { AuditFilterPanel } from '../components/audit/AuditFilterPanel';
import { useAuditData } from '../hooks/useAuditData';
import { useAuditFilters } from '../hooks/useAuditFilters';
import type { AuditItem } from '../services/auditService';

export function AuditReceipt() {
    const { hasPermission } = useAuth();
    const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const { data: queryData, isLoading: loading, error, refetch } = useAuditData();

    // Abstracted Filters and State Derivation
    const { state, setters, options, results } = useAuditFilters(queryData);

    if (!hasPermission('gestao_auditoria')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar a Auditoria de Recebimento.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold mb-2">Erro</h2>
                <p>{error.message || 'Falha ao carregar dados de auditoria.'}</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <PageHeader
                title="Auditoria de Recebimento"
                subtitle="Confronto entre NFs de Entrada e Análises Técnicas (Nuntec)"
                icon={ShieldCheck}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Guia de Procedimento"
                    >
                        <CircleHelp size={24} />
                    </button>

                    {queryData?.isSystemMock ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm">
                            <Info size={18} />
                            <span className="font-medium">Modo Simulação</span>
                        </div>
                    ) : (queryData && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm">
                            <CheckCircle size={18} />
                            <span className="font-medium">Conectado</span>
                        </div>
                    ))}
                </div>
            </PageHeader>

            {loading ? (
                <>
                    <StatsSkeleton count={3} />
                    <TableSkeleton rows={6} columns={8} />
                </>
            ) : (
                <>
                    <AuditStatsCards stats={results.stats} />

                    {/* DT-08: Advanced filters extracted to AuditFilterPanel */}
                    <FilterBar
                        onSearch={setters.setSearchTerm}
                        searchValue={state.searchTerm}
                        searchPlaceholder="Buscar por NF ou Fazenda..."
                        onClear={setters.clearFilters}
                        hasActiveFilters={
                            state.searchTerm !== '' ||
                            state.statusFilter !== 'ALL' ||
                            state.conformityFilter !== 'ALL' ||
                            state.farmFilter !== 'ALL' ||
                            state.fuelFilter !== 'ALL' ||
                            state.supplierFilter !== 'ALL'
                        }
                        advancedFilters={
                            <AuditFilterPanel
                                state={state}
                                setters={setters}
                                options={options}
                            />
                        }
                    />

                    {/* Audit Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-semibold text-slate-800">Detalhamento das Entradas</h2>
                            <span className="text-xs font-bold text-slate-500 uppercase bg-slate-200 px-2 py-1 rounded-md">
                                {results.filteredItems.length} Registros
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">NF</th>
                                        <th className="px-4 py-3">Data/Hora</th>
                                        <th className="px-4 py-3">Unidade (Fazenda)</th>
                                        <th className="px-4 py-3 text-right">Volume NF (L)</th>
                                        <th className="px-4 py-3 text-right">Diferença (L)</th>
                                        <th className="px-4 py-3 text-right">Diff %</th>
                                        <th className="px-4 py-3">Conformidade Técnica</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.filteredItems.length > 0 ? (
                                        results.filteredItems.map((item) => (
                                            <AuditRow
                                                key={item.id}
                                                item={item}
                                                onClick={() => setSelectedItem(item)}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FilterX size={32} className="opacity-20" />
                                                    <p>Nenhum registro encontrado com os filtros atuais.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <AuditDetailsModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                data={selectedItem}
            />

            <ReceiptGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
    );
}
