import { useQuery } from '@tanstack/react-query';
import { auditService, AuditResponse } from '../services/auditService';

export const AUDIT_QUERY_KEY = 'auditData';

export function useAuditData() {
    return useQuery<AuditResponse, Error>({
        queryKey: [AUDIT_QUERY_KEY],
        queryFn: async () => {
            const data = await auditService.getAuditData();
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        refetchOnWindowFocus: true, // Auto-update when returning to app
    });
}
