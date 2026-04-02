import { useMutation, useQueryClient } from '@tanstack/react-query';
import { drainageService } from '../services/drainageService';

/**
 * Hook central de exclusão. Protegido pelas regras de negócio
 * e com revalidação automática de chaves do React Query.
 */
export function useDrainageDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await drainageService.deleteDrainage(id);
    },
    onSuccess: () => {
      // Invalida as listas principais para refresco da tela sem loading indicators pesados
      queryClient.invalidateQueries({ queryKey: ['drainages'] });
    },
  });
}
