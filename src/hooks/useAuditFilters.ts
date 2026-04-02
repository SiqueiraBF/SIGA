import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { AuditResponse } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

export function useAuditFilters(data: AuditResponse | null | undefined) {
    const { user, role } = useAuth();
    const viewScope = role?.permissoes?.gestao_auditoria?.view_scope || 'SAME_FARM';
    const isRestricted = viewScope !== 'ALL' && !!user?.fazenda?.nome;

    // Filters State
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [conformityFilter, setConformityFilter] = useState('ALL');
    const [farmFilter, setFarmFilter] = useState('ALL');
    const [fuelFilter, setFuelFilter] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState('ALL');

    // Initialize Farm Filter based on User Context
    useEffect(() => {
        if (isRestricted && user?.fazenda?.nome) {
            setFarmFilter(user.fazenda.nome);
        }
    }, [isRestricted, user]);

    // Derived State: Core Filtered Data (Context Filters: Date, Farm, Search, Status, Conformity)
    const coreFilteredItems = useMemo(() => {
        if (!data?.data) return [];
        return data.data.filter(item => {
            // Permission Check: Enforce Farm Restriction only if not ALL scope
            if (isRestricted && user.fazenda?.nome && !item.unit_id?.includes(user.fazenda.nome)) {
                return false;
            }

            // 1. Date Range
            const itemDate = item.date ? parseISO(item.date) : null;
            if (itemDate) {
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                end.setHours(23, 59, 59, 999);
                if (itemDate < start || itemDate > end) return false;
            }

            // 2. Search Term (NF or Unit)
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const nf = item.invoiceNumber?.toLowerCase() || '';
                const unit = item.unit_id?.toLowerCase() || '';
                if (!nf.includes(searchLower) && !unit.includes(searchLower)) return false;
            }

            // 3. Status
            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

            // 4. Conformity
            if (conformityFilter !== 'ALL' && item.conformity !== conformityFilter) return false;

            // 5. Farm (Unit)
            if (farmFilter !== 'ALL') {
                if (item.farm_name) {
                    if (item.farm_name !== farmFilter) return false;
                } else {
                    if (!item.unit_id?.includes(farmFilter)) return false;
                }
            }

            return true;
        });
    }, [data, startDate, endDate, searchTerm, statusFilter, conformityFilter, farmFilter, user]);

    // Derived State: Final Filtered Items (Applying Specific Filters: Fuel, Supplier)
    const filteredItems = useMemo(() => {
        return coreFilteredItems.filter(item => {
            // 6. Fuel Type
            if (fuelFilter !== 'ALL' && item.fuel_name !== fuelFilter) return false;

            // 7. Supplier
            if (supplierFilter !== 'ALL') {
                if (!item.analysis?.supplier_name || item.analysis.supplier_name !== supplierFilter) {
                    return false;
                }
            }
            return true;
        });
    }, [coreFilteredItems, fuelFilter, supplierFilter]);

    // Derived State: Unique Farms
    const uniqueFarms = useMemo(() => {
        if (!data?.data) return [];
        if (isRestricted && user.fazenda?.nome) return [user.fazenda.nome];

        const farms = new Set<string>();
        data.data.forEach(i => {
            if (i.farm_name) {
                farms.add(i.farm_name);
            } else if (i.unit_id) {
                let cleanName = i.unit_id.replace(/^\[.*?\]\s*/, '').trim();
                const parts = cleanName.split(' - ');
                farms.add(parts.length > 0 ? parts[0].trim() : cleanName);
            }
        });
        return Array.from(farms).sort();
    }, [data, isRestricted, user]);

    // Derived State: Unique Fuels
    const uniqueFuels = useMemo(() => {
        const fuels = new Set<string>();
        coreFilteredItems.forEach(i => {
            if (i.fuel_name) fuels.add(i.fuel_name);
        });
        return Array.from(fuels).sort();
    }, [coreFilteredItems]);

    // Derived State: Unique Suppliers
    const uniqueSuppliers = useMemo(() => {
        const suppliers = new Set<string>();
        coreFilteredItems.forEach(i => {
            if (i.analysis?.supplier_name) suppliers.add(i.analysis.supplier_name);
        });
        return Array.from(suppliers).sort();
    }, [coreFilteredItems]);

    // Derived State: Stats based on Filtered Items
    const derivedStats = useMemo(() => {
        if (!filteredItems.length) {
            return {
                totalVolume: 0,
                analysisCoverage: 0,
                totalAnalyzed: 0,
                totalDifference: 0
            };
        }

        const totalVolume = filteredItems.reduce((acc, item) => acc + item.volume, 0);
        const totalDifference = filteredItems.reduce((acc, item) => acc + item.difference, 0);
        const totalAnalyzed = filteredItems.filter(item => item.status === 'ANALYZED').length;
        const analysisCoverage = (totalAnalyzed / filteredItems.length) * 100;

        return {
            totalVolume,
            analysisCoverage,
            totalAnalyzed,
            totalDifference
        };
    }, [filteredItems]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setConformityFilter('ALL');
        if (isRestricted) setFarmFilter(user?.fazenda?.nome || 'ALL');
        else setFarmFilter('ALL');
        setFuelFilter('ALL');
        setSupplierFilter('ALL');
        setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
    };

    return {
        state: {
            startDate, endDate, searchTerm, statusFilter, conformityFilter, farmFilter, fuelFilter, supplierFilter
        },
        setters: {
            setStartDate, setEndDate, setSearchTerm, setStatusFilter, setConformityFilter, setFarmFilter, setFuelFilter, setSupplierFilter, clearFilters
        },
        options: {
            uniqueFarms, uniqueFuels, uniqueSuppliers
        },
        results: {
            filteredItems,
            stats: derivedStats
        }
    };
}
