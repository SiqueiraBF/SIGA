import { useState, useMemo } from 'react';
import { differenceInHours, parseISO } from 'date-fns';
import type { Posto, NuntecMeasurement } from '../types';
import { useAuth } from '../context/AuthContext';

export function useStationFilters(postos: (Posto & { fazenda: { nome: string } })[], measurements: NuntecMeasurement[]) {
    const { user, role } = useAuth();

    // Filter States
    const [viewType, setViewType] = useState<'FISICO' | 'VIRTUAL'>('FISICO');
    const [selectedFazenda, setSelectedFazenda] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
    const [monitoringFilter, setMonitoringFilter] = useState<'ok' | 'late' | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Active View Objects Configuration
    const currentViewPostos = useMemo(() => {
        return postos.filter(p => {
            // Permission Check: Same Farm
            if (role?.permissoes?.gestao_postos?.view_scope === 'SAME_FARM') {
                if (user?.fazenda_id && p.fazenda_id !== user.fazenda_id) return false;
            }
            // Strict view type match (Default to FISICO if null)
            return (p.tipo || 'FISICO') === viewType;
        });
    }, [postos, role, user, viewType]);

    const monitoredCount = useMemo(() => {
        return currentViewPostos.filter(p => p.nuntec_reservoir_id).length;
    }, [currentViewPostos]);

    // Active Card Filtering
    const filteredPostos = useMemo(() => {
        return currentViewPostos.filter(p => {
            const matchesFazenda = selectedFazenda === 'all' || p.fazenda_id === selectedFazenda;
            const matchesStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? p.ativo : !p.ativo;
            const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());

            // Complex Monitoring Filtering Logic
            let matchesMonitoring = true;
            if (monitoringFilter && viewType === 'FISICO') {
                if (!p.nuntec_reservoir_id) {
                    matchesMonitoring = false; // Exclude non-monitored stations when filtering by late/ok
                } else {
                    const m = measurements.find(m => String(m['reservoir-id']) === String(p.nuntec_reservoir_id));

                    if (monitoringFilter === 'ok') {
                        if (!m) matchesMonitoring = false;
                        else {
                            const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
                            matchesMonitoring = hours < 48;
                        }
                    } else if (monitoringFilter === 'late') {
                        if (!m) matchesMonitoring = true; // No reading = late
                        else {
                            const hours = differenceInHours(new Date(), parseISO(m['measured-at']));
                            matchesMonitoring = hours >= 48;
                        }
                    }
                }
            }

            return matchesFazenda && matchesStatus && matchesSearch && matchesMonitoring;
        });
    }, [currentViewPostos, viewType, selectedFazenda, filterStatus, searchTerm, monitoringFilter, measurements]);

    return {
        // Exposed States
        state: {
            viewType,
            selectedFazenda,
            filterStatus,
            monitoringFilter,
            searchTerm
        },
        // State Setters
        setters: {
            setViewType,
            setSelectedFazenda,
            setFilterStatus,
            setMonitoringFilter,
            setSearchTerm,
            clearFilters: () => {
                setSelectedFazenda('all');
                setFilterStatus('active');
                setMonitoringFilter(null);
                setSearchTerm('');
            }
        },
        // Computed Values for Render
        computed: {
            currentViewPostos,
            filteredPostos,
            monitoredCount
        }
    };
}
