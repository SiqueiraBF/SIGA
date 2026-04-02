import { useQuery } from '@tanstack/react-query';
import { drainageService, StationDrainage } from '../services/drainageService';
import { fuelService } from '../services/fuelService';

/**
 * Hook central de busca de dados (Consultas Globais / Listagens) do módulo de Drenagem.
 * Revalida no focus e gerencia o lifecycle do carregamento.
 */

interface DrainageFilters {
  fazenda_id?: string;
  posto_id?: string;
  usuario_id?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useDrainageData(
  filters: DrainageFilters = {},
  canViewAll: boolean = false,
  userFazendaId?: string,
) {
  // Se o usuário não puder ver tudo e tiver uma fazenda fixa, injete o ID dele no filtro forçadamente.
  const appliedFilters = { ...filters };
  if (!canViewAll && userFazendaId) {
    appliedFilters.fazenda_id = userFazendaId;
  }

  const drainagesQuery = useQuery({
    queryKey: ['drainages', appliedFilters],
    queryFn: async () => {
      const data = await drainageService.getDrainages(appliedFilters);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  const distinctFarmsQuery = useQuery({
    queryKey: ['drainage-distinct-farms'],
    queryFn: () => drainageService.getDistinctFarms(),
    staleTime: 1000 * 60 * 30, // 30 min (raramente muda)
  });

  const distinctUsersQuery = useQuery({
    queryKey: ['drainage-distinct-users'],
    queryFn: () => drainageService.getDistinctUsers(),
    staleTime: 1000 * 60 * 30,
  });

  return {
    drainages: drainagesQuery.data || [],
    isLoading: drainagesQuery.isLoading,
    isError: drainagesQuery.isError,
    error: drainagesQuery.error,
    refetch: drainagesQuery.refetch,

    distinctFarms: distinctFarmsQuery.data || [],
    distinctUsers: distinctUsersQuery.data || [],
  };
}

/**
 * Hook secundário focado especificamente no carregamento de propriedades para formulários
 * (Ex: Buscar os postos/tanques de uma fazenda para popular selects).
 */
export function useDrainageStationsData(fazendaId?: string) {
  const stationsQuery = useQuery({
    queryKey: ['stations-for-drainage', fazendaId],
    queryFn: () => fuelService.getPostos(fazendaId),
    enabled: !!fazendaId,
    staleTime: 1000 * 60 * 10,
  });

  const physicalStations = (stationsQuery.data || []).filter(
    (p) => p.ativo && p.tipo === 'FISICO' && p.exibir_na_drenagem !== false,
  );

  return {
    stations: physicalStations,
    isLoading: stationsQuery.isLoading,
    isError: stationsQuery.isError,
  };
}
