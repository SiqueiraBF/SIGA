import { useQuery } from '@tanstack/react-query';
import { fuelService } from '../services/fuelService';
import { db } from '../services/supabaseService';
import { nuntecService } from '../services/nuntecService';
import { drainageService } from '../services/drainageService';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';

export function useStationData() {
    const { user, role } = useAuth();

    // Determine view scope from ACL
    const targetFarmId = role?.permissoes?.gestao_postos?.view_scope === 'SAME_FARM' ? user?.fazenda_id : undefined;

    // 1. Core Data Query (Fast)
    const {
        data: coreData,
        isLoading: isLoadingCore,
        error: coreError,
        refetch: refetchCore
    } = useQuery({
        queryKey: ['stations-core-data', targetFarmId],
        queryFn: async () => {
            const [fazendas, postos] = await Promise.all([
                db.getFazendas(),
                fuelService.getPostos(targetFarmId),
            ]);

            return {
                fazendas: fazendas.filter(f => f.ativo),
                postos
            };
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Extract allowed reservoirs to pass to the next query safely
    const allowedReservoirs = useMemo(() => {
        if (!coreData?.postos) return [];
        return coreData.postos
            .map(p => p.nuntec_reservoir_id ? String(p.nuntec_reservoir_id) : null)
            .filter(Boolean) as string[];
    }, [coreData?.postos]);

    // 2. Integration Data Query (Dependent on Core Data Postos)
    const {
        data: integrationData,
        isLoading: isLoadingIntegration,
        error: integrationError
    } = useQuery({
        queryKey: ['stations-integration-data', allowedReservoirs],
        queryFn: async () => {
            if (allowedReservoirs.length === 0) {
                return {
                    measurements: [],
                    stationData: [],
                    admeasurements: [],
                    drainageData: {} as Record<string, string>
                };
            }

            const [measurements, stationData, admeasurements, drainages] = await Promise.all([
                nuntecService.getStockMeasurements(allowedReservoirs),
                nuntecService.getStationsData(allowedReservoirs),
                nuntecService.getAdmeasurements(allowedReservoirs),
                drainageService.getLatestDrainagesByStation(targetFarmId)
            ]);

            const drainageData: Record<string, string> = {};
            drainages.forEach(d => {
                if (!drainageData[d.posto_id] || new Date(d.data_drenagem) > new Date(drainageData[d.posto_id])) {
                    drainageData[d.posto_id] = d.data_drenagem;
                }
            });

            return {
                measurements,
                stationData,
                admeasurements,
                drainageData
            };
        },
        enabled: !!coreData?.postos, // Only run after core data is loaded
        staleTime: 2 * 60 * 1000 // 2 minutes (Measurements change often)
    });

    // 3. Autonomy Data Query (Slow - Background)
    const {
        data: transfers,
        isLoading: isLoadingAutonomy
    } = useQuery({
        queryKey: ['stations-autonomy', allowedReservoirs],
        queryFn: async () => {
            if (allowedReservoirs.length === 0) return [];
            return await nuntecService.getConsumptions(7, undefined, allowedReservoirs);
        },
        enabled: !!coreData?.postos && allowedReservoirs.length > 0,
        staleTime: 30 * 60 * 1000 // 30 mins
    });

    return {
        // Data Payloads
        fazendas: coreData?.fazendas || [],
        postos: coreData?.postos || [],
        measurements: integrationData?.measurements || [],
        stationData: integrationData?.stationData || [],
        admeasurements: integrationData?.admeasurements || [],
        drainageData: integrationData?.drainageData || {},
        transfers: transfers || [],

        // Loading States
        isLoading: isLoadingCore || (!integrationData && isLoadingIntegration),
        isLoadingAutonomy,

        // Error / Refresh Handling
        error: coreError || integrationError,
        refetch: refetchCore
    };
}
