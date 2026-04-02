import { useQuery } from '@tanstack/react-query';
import { cleaningService } from '../services/cleaningService';

export const useGetCleanings = (filters?: {
  fazenda_id?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
}) => {
  return useQuery({
    queryKey: ['cleanings', filters],
    queryFn: () => cleaningService.getCleanings(filters),
  });
};

export const useGetWeeklyStatus = (fazendaId?: string) => {
  return useQuery({
    queryKey: ['cleaningWeeklyStatus', fazendaId],
    queryFn: () => cleaningService.getWeeklyStatus(fazendaId),
    enabled: !!fazendaId,
  });
};

export const useGetAllFarmsWeeklyStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cleaningAllFarmsWeeklyStatus'],
    queryFn: () => cleaningService.getAllFarmsWeeklyStatus(),
    enabled,
  });
};
