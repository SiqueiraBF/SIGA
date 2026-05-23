import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { pcmService, PcmRequest } from '../services/pcmService';
import { differenceInMinutes, parseISO, subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';

export interface PcmDashboardMetrics {
    leadTimeAverageMinutes: number;
    leadTimeAverageFormatted: string;
    waitingList: PcmRequest[];
    volumeByFarm: { name: string; value: number }[];
    entriesVsExitsByDay: { date: string; criadas: number; finalizadas: number; aguardando: number }[];
    totalCriadas: number;
    totalFinalizadas: number;
}

export type PeriodFilter = '7D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export function usePcmDashboardMetrics(
    period: PeriodFilter = '7D',
    customStart?: Date | null,
    customEnd?: Date | null,
    selectedFarm?: string | null
) {
    return useQuery({
        queryKey: ['pcm-dashboard', period, customStart?.toISOString(), customEnd?.toISOString(), selectedFarm],
        queryFn: async (): Promise<PcmDashboardMetrics> => {
            const requests = await pcmService.getRequests();

            const today = new Date();
            let startDate: Date;
            let endDate: Date = endOfDay(today);

            if (period === '7D') {
                startDate = startOfDay(subDays(today, 6));
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

            const isWithinPeriod = (dateStr: string | null | undefined) => {
                if (!dateStr) return false;
                const date = parseISO(dateStr);
                return (isAfter(date, startDate) || isEqual(date, startDate)) &&
                    (isBefore(date, endDate) || isEqual(date, endDate));
            };

            const matchesFarm = (r: PcmRequest) => {
                if (!selectedFarm) return true;
                const farmName = r.fazenda?.nome || 'Desconhecido';
                return farmName === selectedFarm;
            };

            let totalCriadas = 0;
            let totalFinalizadas = 0;

            requests.forEach(r => {
                if (matchesFarm(r)) {
                    if (isWithinPeriod(r.created_at)) {
                        totalCriadas++;
                    }
                    if (r.data_confirmacao && isWithinPeriod(r.data_confirmacao)) {
                        totalFinalizadas++;
                    }
                }
            });

            const activeRequestsInPeriod = requests.filter(r =>
                matchesFarm(r) &&
                (isWithinPeriod(r.created_at) || (r.data_confirmacao && isWithinPeriod(r.data_confirmacao)))
            );

            const finalized = activeRequestsInPeriod.filter(r => r.data_confirmacao !== null);
            let totalMinutes = 0;
            let validFinalizedCount = 0;

            finalized.forEach(r => {
                if (r.created_at && r.data_confirmacao) {
                    const entryDate = parseISO(r.created_at);
                    const exitDate = parseISO(r.data_confirmacao);

                    if (!isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
                        const diff = differenceInMinutes(exitDate, entryDate);
                        if (diff >= 0) {
                            totalMinutes += diff;
                            validFinalizedCount++;
                        }
                    }
                }
            });

            const avgMinutes = validFinalizedCount > 0 ? totalMinutes / validFinalizedCount : 0;
            const hours = Math.floor(avgMinutes / 60);
            const remainingMinutes = Math.floor(avgMinutes % 60);

            let formattedLeadTime = '0h 0m';
            if (hours > 0 && remainingMinutes > 0) formattedLeadTime = `${hours}h ${remainingMinutes}m`;
            else if (hours > 0) formattedLeadTime = `${hours}h`;
            else if (remainingMinutes > 0) formattedLeadTime = `${remainingMinutes}m`;

            const waiting = requests.filter(r =>
                matchesFarm(r) &&
                !r.data_confirmacao && 
                r.created_at &&
                (isBefore(parseISO(r.created_at), endDate) || isEqual(parseISO(r.created_at), endDate))
            );
            waiting.sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateA - dateB;
            });

            const farmMap = new Map<string, number>();
            requests.forEach(r => {
                if (r.created_at && isWithinPeriod(r.created_at)) {
                    const farmName = r.fazenda?.nome || 'Desconhecido';
                    farmMap.set(farmName, (farmMap.get(farmName) || 0) + 1);
                }
            });
            const volumeByFarm = Array.from(farmMap.entries()).map(([name, value]) => ({ name, value }));
            volumeByFarm.sort((a, b) => b.value - a.value);

            const daysMap = new Map<string, { criadas: number, finalizadas: number }>();
            let currentDateWalk = new Date(startDate);
            while (isBefore(currentDateWalk, endDate) || isEqual(startOfDay(currentDateWalk), startOfDay(endDate))) {
                const dateStr = currentDateWalk.toISOString().split('T')[0];
                daysMap.set(dateStr, { criadas: 0, finalizadas: 0 });
                currentDateWalk.setDate(currentDateWalk.getDate() + 1);
            }

            let initialAguardando = 0;
            requests.forEach(r => {
                if (matchesFarm(r)) {
                    if (r.created_at && isBefore(parseISO(r.created_at), startDate)) {
                        initialAguardando++;
                    }
                    if (r.data_confirmacao && isBefore(parseISO(r.data_confirmacao), startDate)) {
                        initialAguardando--;
                    }
                }
            });

            requests.forEach(r => {
                if (matchesFarm(r)) {
                    if (isWithinPeriod(r.created_at)) {
                        const date = r.created_at.split('T')[0];
                        if (daysMap.has(date)) daysMap.get(date)!.criadas++;
                    }

                    if (r.data_confirmacao && isWithinPeriod(r.data_confirmacao)) {
                        const date = r.data_confirmacao.split('T')[0];
                        if (daysMap.has(date)) daysMap.get(date)!.finalizadas++;
                    }
                }
            });

            const sortedDates = Array.from(daysMap.keys()).sort();

            let accumulatedAguardando = initialAguardando;
            const entriesVsExitsByDay = sortedDates.map(date => {
                const dayData = daysMap.get(date)!;
                accumulatedAguardando += dayData.criadas;
                accumulatedAguardando -= dayData.finalizadas;

                return {
                    date,
                    criadas: dayData.criadas,
                    finalizadas: dayData.finalizadas,
                    aguardando: accumulatedAguardando 
                };
            });

            return {
                leadTimeAverageMinutes: avgMinutes,
                leadTimeAverageFormatted: formattedLeadTime,
                waitingList: waiting,
                volumeByFarm,
                entriesVsExitsByDay,
                totalCriadas,
                totalFinalizadas
            };
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData
    });
}
