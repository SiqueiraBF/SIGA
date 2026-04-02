import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cleaningService } from '../services/cleaningService';

export const useCleaningDelete = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await cleaningService.deleteCleaning(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cleanings'] });
            queryClient.invalidateQueries({ queryKey: ['cleaningWeeklyStatus'] });
            queryClient.invalidateQueries({ queryKey: ['cleaningAllFarmsWeeklyStatus'] });
        },
    });
};
