import { useState, useMemo } from 'react';
import { differenceInHours, parseISO } from 'date-fns';
import type { Posto, NuntecMeasurement, NuntecAdmeasurement, NuntecReservoir } from '../types';
import { useAuth } from '../context/AuthContext';

export function useStationFilters(
    postos: (Posto & { fazenda: { nome: string } })[], 
    measurements: NuntecMeasurement[],
    admeasurements: NuntecAdmeasurement[],
    drainageData: Record<string, string>,
    stationData: NuntecReservoir[]
) {
    const { user, role } = useAuth();

    // Filter States
    const [viewType, setViewType] = useState<'FISICO' | 'VIRTUAL'>('FISICO');
    const [selectedFazenda, setSelectedFazenda] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
    const [monitoringFilter, setMonitoringFilter] = useState<'ok' | 'late' | 'drainage_late' | 'admeasurement_late' | null>(null);
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
                    } else if (monitoringFilter === 'drainage_late') {
                        if (p.exibir_na_drenagem === false) {
                            matchesMonitoring = false;
                        } else {
                            const lastDrainage = drainageData[p.id];
                            if (!lastDrainage) {
                                matchesMonitoring = true;
                            } else {
                                const days = differenceInHours(new Date(), new Date(lastDrainage)) / 24;
                                matchesMonitoring = days > 7;
                            }
                        }
                    } else if (monitoringFilter === 'admeasurement_late') {
                        const reservoirData = stationData.find(r => String(r.id) === String(p.nuntec_reservoir_id)) ||
                            stationData.find(r => r.nozzleIds?.includes(String(p.nuntec_reservoir_id)));
                        
                        if (!reservoirData) {
                            matchesMonitoring = false;
                        } else {
                            const latestAdmeasurement = admeasurements.find(a => reservoirData.nozzleIds?.includes(a['nozzle-id']));
                            if (!latestAdmeasurement) {
                                matchesMonitoring = true;
                            } else {
                                const days = differenceInHours(new Date(), parseISO(latestAdmeasurement['updated-at'])) / 24;
                                matchesMonitoring = days > 60;
                            }
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
