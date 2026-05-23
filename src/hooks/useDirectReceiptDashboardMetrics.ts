import { useQuery } from '@tanstack/react-query';
import { directReceiptService } from '../services/directReceiptService';
import { DirectReceipt } from '../types';
import {
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    format,
    differenceInDays,
    parseISO,
} from 'date-fns';

export type PeriodFilter = '7D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export function useDirectReceiptDashboardMetrics(
    period: PeriodFilter,
    customStart: Date | null,
    customEnd: Date | null,
    fazendaFilter: string | null = null
) {
    return useQuery({
        queryKey: ['direct-receipt-dashboard', period, customStart, customEnd, fazendaFilter],
        queryFn: async () => {
            let dataInicio: string | undefined;
            let dataFim: string | undefined;

            const today = new Date();

            switch (period) {
                case '7D':
                    dataInicio = format(subDays(today, 7), 'yyyy-MM-dd');
                    dataFim = format(today, 'yyyy-MM-dd');
                    break;
                case 'THIS_MONTH':
                    dataInicio = format(startOfMonth(today), 'yyyy-MM-dd');
                    dataFim = format(endOfMonth(today), 'yyyy-MM-dd');
                    break;
                case 'LAST_MONTH':
                    const lastMonth = subMonths(today, 1);
                    dataInicio = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
                    dataFim = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
                    break;
                case 'CUSTOM':
                    if (customStart && customEnd) {
                        dataInicio = format(customStart, 'yyyy-MM-dd');
                        dataFim = format(customEnd, 'yyyy-MM-dd');
                    }
                    break;
            }

            // Busca os dados filtrados
            const response = await directReceiptService.getDirectReceipts({
                dataInicio,
                dataFim,
                fazenda_id: fazendaFilter || undefined
            });

            const receipts = response.data;

            // Agregações

            // 1. Contagem e Valor Total
            const totalCount = receipts.length;
            const totalValue = receipts.reduce((sum: number, r: DirectReceipt) => sum + Number(r.valor || 0), 0);
            
            // Formatando valor
            const totalValueFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue);

            // 2. Frequência por Fazenda (Gráfico de Pizza)
            const fazendaMap = new Map<string, number>();
            receipts.forEach((r: DirectReceipt) => {
                const fName = r.fazenda?.nome || 'Não informada';
                fazendaMap.set(fName, (fazendaMap.get(fName) || 0) + 1);
            });
            const volumeByFazenda = Array.from(fazendaMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            // 3. Ranking de Locais (Gráfico de Barras)
            const localMap = new Map<string, number>();
            receipts.forEach((r: DirectReceipt) => {
                const local = r.local_recebimento === 'outros' ? 'OUTROS' : r.local_recebimento;
                const localFormatted = local.toUpperCase();
                localMap.set(localFormatted, (localMap.get(localFormatted) || 0) + 1);
            });
            const rankingLocais = Array.from(localMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            // 4. Atraso de Registro (Média e Ranking)
            let sumAtrasoDays = 0;
            let validAtrasoCount = 0;
            
            // Calculando a diferença em dias e criando lista para ranking top 10
            const receiptsComAtraso = receipts.map((r: DirectReceipt) => {
                const emissaoDate = new Date(r.data_emissao);
                const registroDate = new Date(r.created_at);
                // Difference between Registration and Emission (Delay)
                const delayDays = differenceInDays(registroDate, emissaoDate);
                
                if (delayDays >= 0) {
                    sumAtrasoDays += delayDays;
                    validAtrasoCount++;
                }

                return {
                    ...r,
                    delayDays: delayDays >= 0 ? delayDays : 0
                };
            }).sort((a: any, b: any) => b.delayDays - a.delayDays); // Decrescente (maior atraso primeiro)

            const avgDelayDays = validAtrasoCount > 0 ? Math.round(sumAtrasoDays / validAtrasoCount) : 0;
            const topDelayed = receiptsComAtraso.slice(0, 10);

            return {
                receipts,
                totalCount,
                totalValue,
                totalValueFormatted,
                volumeByFazenda,
                rankingLocais,
                avgDelayDays,
                topDelayed
            };
        },
        staleTime: 5 * 60 * 1000, 
    });
}
