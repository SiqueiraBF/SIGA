import type { useAuditFilters } from '../../hooks/useAuditFilters';

// Infer the return type of the hook for strong prop typing
type AuditFiltersHook = ReturnType<typeof useAuditFilters>;

interface AuditFilterPanelProps {
    state: AuditFiltersHook['state'];
    setters: AuditFiltersHook['setters'];
    options: AuditFiltersHook['options'];
}

/**
 * Advanced filter panel extracted from AuditReceipt page.
 * DT-08: Filters are no longer inline in the page component.
 * Receives state, setters and options from the useAuditFilters hook.
 */
export function AuditFilterPanel({ state, setters, options }: AuditFilterPanelProps) {
    return (
        <>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Período (Início)
                </label>
                <input
                    type="date"
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                    value={state.startDate}
                    onChange={(e) => setters.setStartDate(e.target.value)}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Período (Fim)
                </label>
                <input
                    type="date"
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm py-2"
                    value={state.endDate}
                    onChange={(e) => setters.setEndDate(e.target.value)}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Status
                </label>
                <select
                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                    value={state.statusFilter}
                    onChange={(e) => setters.setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Todos</option>
                    <option value="ANALYZED">Com Análise</option>
                    <option value="MISSING_ANALYSIS">Análise Pendente (Tem Entrada)</option>
                    <option value="MISSING_ENTRY">Entrada Pendente (Tem Análise)</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Conformidade
                </label>
                <select
                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                    value={state.conformityFilter}
                    onChange={(e) => setters.setConformityFilter(e.target.value)}
                >
                    <option value="ALL">Todas</option>
                    <option value="conforming">Conforme</option>
                    <option value="non_conforming">Não Conforme</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Fazenda
                </label>
                <select
                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                    value={state.farmFilter}
                    onChange={(e) => setters.setFarmFilter(e.target.value)}
                >
                    <option value="ALL">Todas</option>
                    {options.uniqueFarms.map(farm => (
                        <option key={farm} value={farm}>{farm}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Combustível
                </label>
                <select
                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                    value={state.fuelFilter}
                    onChange={(e) => setters.setFuelFilter(e.target.value)}
                >
                    <option value="ALL">Todos</option>
                    {options.uniqueFuels.map(fuel => (
                        <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                    Fornecedor
                </label>
                <select
                    className="w-full text-sm rounded-lg border-slate-200 bg-white py-2"
                    value={state.supplierFilter}
                    onChange={(e) => setters.setSupplierFilter(e.target.value)}
                >
                    <option value="ALL">Todos</option>
                    {options.uniqueSuppliers.map(sup => (
                        <option key={sup} value={sup}>{sup}</option>
                    ))}
                </select>
            </div>
        </>
    );
}
