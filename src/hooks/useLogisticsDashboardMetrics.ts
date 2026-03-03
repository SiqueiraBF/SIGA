import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { goodsReceiptService } from '../services/goodsReceiptService';
import { GoodsReceipt } from '../types';
import { differenceInMinutes, parseISO, subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';

export interface DashboardMetrics {
    leadTimeAverageMinutes: number;
    leadTimeAverageFormatted: string;
    waitingList: GoodsReceipt[];
    volumeByDestination: { name: string; value: number }[];
    entriesVsExitsByDay: { date: string; entradas: number; saidas: number; patio: number }[];
    totalEntradas: number;
    totalSaidas: number;
}

export type PeriodFilter = '7D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export function useLogisticsDashboardMetrics(
    period: PeriodFilter = '7D',
    customStart?: Date | null,
    customEnd?: Date | null,
    selectedDestination?: string | null
) {
    return useQuery({
        queryKey: ['logistics-dashboard', period, customStart?.toISOString(), customEnd?.toISOString(), selectedDestination],
        queryFn: async (): Promise<DashboardMetrics> => {
            const receipts = await goodsReceiptService.getAllReceipts();

            // Determinar o range de datas
            const today = new Date();
            let startDate: Date;
            let endDate: Date = endOfDay(today);

            if (period === '7D') {
                startDate = startOfDay(subDays(today, 6)); // Ultimos 7 dias incluindo hoje
            } else if (period === 'THIS_MONTH') {
                startDate = startOfMonth(today);
                endDate = endOfMonth(today);
            } else if (period === 'LAST_MONTH') {
                const lastMonth = subMonths(today, 1);
                startDate = startOfMonth(lastMonth);
                endDate = endOfMonth(lastMonth);
            } else {
                startDate = customStart ? startOfDay(customStart) : startOfDay(subDays(today, 30));
                endDate = customEnd ? endOfDay(customEnd) : endOfDay(today);
            }

            // Função helper para verificar se uma data cai no intervalo
            const isWithinPeriod = (dateStr: string | null | undefined) => {
                if (!dateStr) return false;
                const date = parseISO(dateStr);
                return (isAfter(date, startDate) || isEqual(date, startDate)) &&
                    (isBefore(date, endDate) || isEqual(date, endDate));
            };

            // Helpers de filtro cruzado
            const matchesDestination = (r: GoodsReceipt) => {
                if (!selectedDestination) return true;
                const destName = r.destination_farm?.nome || 'Desconhecido';
                return destName === selectedDestination;
            };

            // Filtrar documentos que OCORRERAM no periodo para estatísticas diretas de período (Entradas/Saídas totais)
            let totalEntradas = 0;
            let totalSaidas = 0;

            receipts.forEach(r => {
                if (matchesDestination(r)) {
                    if (isWithinPeriod(r.entry_at)) {
                        totalEntradas++;
                    }
                    if (r.exit_id && isWithinPeriod(r.exit?.exit_date)) {
                        totalSaidas++;
                    }
                }
            });

            // 1. Lead Time Médio (Apenas NFs despachadas cujo despache ATINGE o período, ou entrada atinge o período)
            // Para ser representativo, vamos pegar notas que tiveram atividade (entrada ou saída) no período
            const activeReceiptsInPeriod = receipts.filter(r =>
                matchesDestination(r) &&
                (isWithinPeriod(r.entry_at) || (r.exit_id && isWithinPeriod(r.exit?.exit_date)))
            );

            const dispatched = activeReceiptsInPeriod.filter(r => r.exit_id !== null && r.exit?.exit_date);
            let totalMinutes = 0;
            let validDispatchedCount = 0;

            dispatched.forEach(r => {
                if (r.entry_at && r.exit?.exit_date) {
                    const entryDate = parseISO(r.entry_at);
                    const exitDate = parseISO(r.exit.exit_date);

                    if (!isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
                        const diff = differenceInMinutes(exitDate, entryDate);
                        if (diff >= 0) {
                            totalMinutes += diff;
                            validDispatchedCount++;
                        }
                    }
                }
            });

            const avgMinutes = validDispatchedCount > 0 ? totalMinutes / validDispatchedCount : 0;
            const hours = Math.floor(avgMinutes / 60);
            const remainingMinutes = Math.floor(avgMinutes % 60);

            let formattedLeadTime = '0h 0m';
            if (hours > 0 && remainingMinutes > 0) formattedLeadTime = `${hours}h ${remainingMinutes}m`;
            else if (hours > 0) formattedLeadTime = `${hours}h`;
            else if (remainingMinutes > 0) formattedLeadTime = `${remainingMinutes}m`;

            // 2. Ranking de Tempo de Pátio (Aguardando)
            // Filtramos as notas retidas cuja entrada tenha sido <= endDate do periodo visualizado.
            // Para mostrar o que tava no pátio até aquele momento final.
            const waiting = receipts.filter(r =>
                matchesDestination(r) &&
                r.exit_id === null &&
                r.entry_at &&
                (isBefore(parseISO(r.entry_at), endDate) || isEqual(parseISO(r.entry_at), endDate))
            );
            waiting.sort((a, b) => {
                const dateA = new Date(a.entry_at).getTime();
                const dateB = new Date(b.entry_at).getTime();
                return dateA - dateB; // Os mais antigos (menor timestamp) ficam primeiro
            });

            // 3. Volume por Destino (Totais de despachos no período)
            // Importante: Este Volume *NÃO sofre filtro do clique*, para que você não perca
            // a visualização do dashboard na rosca enquanto estiver filtrado.
            const destinationMap = new Map<string, number>();
            receipts.forEach(r => {
                // Conta destino se a saída ocorreu no período
                if (r.exit_id && isWithinPeriod(r.exit?.exit_date)) {
                    const destName = r.destination_farm?.nome || 'Desconhecido';
                    destinationMap.set(destName, (destinationMap.get(destName) || 0) + 1);
                }
            });
            const volumeByDestination = Array.from(destinationMap.entries()).map(([name, value]) => ({ name, value }));
            volumeByDestination.sort((a, b) => b.value - a.value);

            // 4. Entradas vs Saídas por dia (Gráfico)
            // Vamos iterar todos os dias de startDate até endDate para garantir que o gráfico de área 
            // não tenha buracos nos dias sem movimento no intervalo escolhido.
            const daysMap = new Map<string, { entradas: number, saidas: number }>();

            // Loop de preenchimento dos dias no período solicitado
            let currentDateWalk = new Date(startDate);
            while (isBefore(currentDateWalk, endDate) || isEqual(startOfDay(currentDateWalk), startOfDay(endDate))) {
                const dateStr = currentDateWalk.toISOString().split('T')[0];
                daysMap.set(dateStr, { entradas: 0, saidas: 0 });
                currentDateWalk.setDate(currentDateWalk.getDate() + 1);
            }

            // Precisamos calcular o saldo de pátio anterior ao startDate para o gráfico iniciar corretamente
            let initialPatio = 0;
            receipts.forEach(r => {
                if (matchesDestination(r)) {
                    if (r.entry_at && isBefore(parseISO(r.entry_at), startDate)) {
                        initialPatio++;
                    }
                    if (r.exit_id && r.exit?.exit_date && isBefore(parseISO(r.exit.exit_date), startDate)) {
                        initialPatio--;
                    }
                }
            });

            // Popular Entradas e Saídas DENTRO do período
            receipts.forEach(r => {
                if (matchesDestination(r)) {
                    if (isWithinPeriod(r.entry_at)) {
                        const date = r.entry_at.split('T')[0];
                        if (daysMap.has(date)) daysMap.get(date)!.entradas++;
                    }

                    if (r.exit_id && isWithinPeriod(r.exit?.exit_date)) {
                        const date = r.exit.exit_date.split('T')[0];
                        if (daysMap.has(date)) daysMap.get(date)!.saidas++;
                    }
                }
            });

            // Ordenar por data e popular Pátio (WIP)
            const sortedDates = Array.from(daysMap.keys()).sort();

            let accumulatedPatio = initialPatio;
            const entriesVsExitsByDay = sortedDates.map(date => {
                const dayData = daysMap.get(date)!;
                accumulatedPatio += dayData.entradas;
                accumulatedPatio -= dayData.saidas;

                return {
                    date,
                    entradas: dayData.entradas,
                    saidas: dayData.saidas,
                    patio: accumulatedPatio // Estoque / Pátio no fim daquele dia
                };
            });

            return {
                leadTimeAverageMinutes: avgMinutes,
                leadTimeAverageFormatted: formattedLeadTime,
                waitingList: waiting,
                volumeByDestination,
                entriesVsExitsByDay,
                totalEntradas,
                totalSaidas
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        placeholderData: keepPreviousData
    });
}
