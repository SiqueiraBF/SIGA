import { supabase } from '../lib/supabase';
import { differenceInHours, startOfMonth, subMonths, format } from 'date-fns';
import { nuntecService } from './nuntecService';
import { fuelService } from './fuelService';
import { db } from './supabaseService';

export interface DashboardStats {
    pendingFuelVolume: number;
    pendingFuelCount?: number;
    pendingFuelByStation?: { name: string; volume: number; count: number }[];
    monthlyRequests: number;
    monthlyItems: number;
    avgResolutionTime: string; // "2.5 Dias"
    scPriorityDistribution: { name: string; value: number; color: string }[];
    fuelHealth?: {
        stations: {
            id: string;
            nome: string;
            currentStock: number;
            capacity: number;
            percentage: number;
            autonomyDays?: number;
            lastMeasurement?: string;
            status: 'ok' | 'warning' | 'critical';
        }[];
    };
}

export interface TimelineEvent {
    id: string;
    title: string;
    date: string;
    type: 'MANUTENCAO' | 'FISCAL' | 'GERAL';
    description?: string;
    recurrence_id?: string;
}

export interface FeedItem {
    id: string;
    type: 'FUEL_PENDING' | 'REQUEST_NEW' | 'REQUEST_UPDATE';
    title: string;
    subtitle: string;
    timestamp: string;
    link: string;
    priority?: 'high' | 'normal' | 'low';
}

const CACHE_TTL = 1 * 1000; // 1 second (debug mode)

interface DashboardCache {
    timestamp: number;
    data: {
        stats: DashboardStats;
        feed: FeedItem[];
        timeline: TimelineEvent[];
    };
    keys: {
        userId: string;
        isAdmin: boolean;
        fazendaId?: string;
    }
}

let _dashboardCache: DashboardCache | null = null;

export const dashboardService = {
    // Cache Management
    invalidateCache() {
        _dashboardCache = null;
    },

    // 1. General Stats (KPIs)
    async getGeneralStats(fazendaId?: string, precomputedNuntecStats?: any): Promise<DashboardStats> {
        try {
            const now = new Date();
            const firstDayOfMonth = startOfMonth(now).toISOString();

            // A. Requests Stats
            const { data: requests, error } = await supabase
                .from('solicitacoes')
                .select('id, data_abertura, prioridade, status, fazenda_id')
                .gte('data_abertura', firstDayOfMonth);

            if (error) throw error;

            const filteredRequests = fazendaId
                ? requests.filter(r => r.fazenda_id === fazendaId)
                : requests;

            const monthlyCount = filteredRequests.length;

            // Calculate total items for these requests
            let monthlyItems = 0;
            if (monthlyCount > 0) {
                const reqIds = filteredRequests.map(r => r.id);
                const { count } = await supabase
                    .from('itens_solicitacao')
                    .select('*', { count: 'exact', head: true })
                    .in('solicitacao_id', reqIds);
                monthlyItems = count || 0;
            }

            const urgentCount = filteredRequests.filter(r => r.prioridade === 'Urgente').length;
            const normalCount = filteredRequests.filter(r => r.prioridade === 'Normal').length;

            const scPriorityDistribution = [
                { name: 'Urgente', value: urgentCount, color: '#ef4444' },
                { name: 'Normal', value: normalCount, color: '#3b82f6' },
            ];

            // Avg Resolution Time
            let avgResolutionTime = '-';
            try {
                let finishedQuery = supabase
                    .from('solicitacoes')
                    .select('id, data_abertura')
                    .eq('status', 'Finalizado')
                    .order('data_abertura', { ascending: false })
                    .limit(50);

                // if (fazendaId) {
                //     finishedQuery = finishedQuery.eq('fazenda_id', fazendaId);
                // }

                const { data: finishedReqs } = await finishedQuery;

                if (finishedReqs && finishedReqs.length > 0) {
                    const ids = finishedReqs.map(r => r.id);

                    const { data: logs } = await supabase
                        .from('audit_logs')
                        .select('registro_id, data_hora, dados_novos')
                        .in('registro_id', ids)
                        .eq('acao', 'STATUS')
                        .order('data_hora', { ascending: false });

                    let totalHours = 0;
                    let count = 0;

                    finishedReqs.forEach(req => {
                        const reqLogs = logs?.filter(l => l.registro_id === req.id) || [];
                        const finishLog = reqLogs.find(l => (l.dados_novos as any)?.status === 'Finalizado');

                        // Find the OLDEST 'Aguardando' log (Start of the process)
                        // logs are DESC, so we take the last one that matches
                        const startLog = [...reqLogs].reverse().find(l => (l.dados_novos as any)?.status === 'Aguardando');

                        if (finishLog) {
                            const endDate = new Date(finishLog.data_hora);
                            const startDate = startLog ? new Date(startLog.data_hora) : new Date(req.data_abertura);

                            const diff = Math.abs(differenceInHours(endDate, startDate));
                            totalHours += diff;
                            count++;
                        }
                    });

                    if (count > 0) {
                        const avgHours = totalHours / count;
                        if (avgHours > 48) {
                            avgResolutionTime = `${(avgHours / 24).toFixed(1)} Dias`;
                        } else {
                            avgResolutionTime = `${avgHours.toFixed(1)} Horas`;
                        }
                    }
                }
            } catch (e) {
                console.warn("Avg time calculation warning:", e);
            }

            // B. Nuntec Pending Volume
            let pendingVolume = 0;
            let pendingFuelCount = 0;
            let pendingFuelByStation: { name: string; volume: number; count: number }[] = [];

            try {
                if (precomputedNuntecStats) {
                    pendingVolume = precomputedNuntecStats.pendingVolume;
                    pendingFuelCount = precomputedNuntecStats.pendingCount;
                    pendingFuelByStation = precomputedNuntecStats.byStation;
                } else {
                    const postos = await fuelService.getPostos();
                    const configuredPostos = postos.filter(p => p.nuntec_reservoir_id);

                    if (configuredPostos.length > 0) {
                        const abastecimentos = await fuelService.getAbastecimentos();
                        const transfers = await nuntecService.getPendingTransfers(configuredPostos, abastecimentos);

                        let visibleTransfers = transfers;

                        if (fazendaId) {
                            const visibleResIds = new Set(
                                configuredPostos.filter(p => p.fazenda_id === fazendaId).map(p => String(p.nuntec_reservoir_id))
                            );
                            visibleTransfers = transfers.filter(t => visibleResIds.has(String(t['pointing-in']['reservoir-id'])));
                        }

                        pendingVolume = visibleTransfers.reduce((acc, curr) => acc + Math.abs(curr['pointing-in'].amount), 0);
                        pendingFuelCount = visibleTransfers.length;

                        // Breakdown by Station
                        const statsMap = new Map<string, { volume: number; count: number }>();
                        // Map reservoir ID to configured station name
                        const resIdToName = new Map<string, string>();
                        configuredPostos.forEach(p => {
                            if (p.nuntec_reservoir_id) resIdToName.set(String(p.nuntec_reservoir_id), p.nome);
                        });

                        visibleTransfers.forEach(t => {
                            const resId = String(t['pointing-in']['reservoir-id']);
                            const name = resIdToName.get(resId) || `Tanque ${resId}`;
                            const amount = Math.abs(t['pointing-in'].amount);

                            const current = statsMap.get(name) || { volume: 0, count: 0 };
                            statsMap.set(name, { volume: current.volume + amount, count: current.count + 1 });
                        });

                        Array.from(statsMap.entries()).forEach(([name, data]) => {
                            pendingFuelByStation.push({ name, ...data });
                        });
                    }
                }
            } catch (e) {
                console.warn("Nuntec stats fetch warning:", e);
            }

            return {
                pendingFuelVolume: Math.round(pendingVolume),
                pendingFuelCount,
                pendingFuelByStation,
                monthlyRequests: monthlyCount,
                monthlyItems,
                avgResolutionTime,
                scPriorityDistribution,
                fuelHealth: precomputedNuntecStats?.fuelHealth
            };

        } catch (error) {
            console.error("Dashboard Stats Error:", error);
            return {
                pendingFuelVolume: 0,
                monthlyRequests: 0,
                monthlyItems: 0,
                avgResolutionTime: '-',
                scPriorityDistribution: []
            };
        }
    },

    // 2. Timeline (System Events)
    async getTimelineEvents(): Promise<TimelineEvent[]> {
        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('system_timeline')
                .select('*')
                .gte('event_date', now.toISOString())
                .order('event_date', { ascending: true })
                .limit(5);

            if (error) {
                return [];
            }

            return data.map((e: any) => ({
                id: e.id,
                title: e.title,
                date: e.event_date,
                type: e.type,
                description: e.description,
                recurrence_id: e.recurrence_id
            }));
        } catch (e) {
            return [];
        }
    },

    async createTimelineEvent(
        event: Omit<TimelineEvent, 'id'>,
        recurrence?: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY', until: string }
    ): Promise<void> {
        const eventsToInsert = [];
        const baseDate = new Date(event.date);

        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                try { return crypto.randomUUID(); } catch (e) { }
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const recurrenceId = recurrence ? generateUUID() : null;

        // Add base event
        eventsToInsert.push({
            title: event.title,
            description: event.description,
            event_date: event.date,
            type: event.type,
            recurrence_id: recurrenceId
        });

        // Generate recurrences
        if (recurrence && recurrence.until) {
            const endDate = new Date(recurrence.until);
            endDate.setHours(23, 59, 59);

            let nextDate = new Date(baseDate);
            let count = 0;
            const MAX_EVENTS = 365;

            while (true) {
                if (recurrence.frequency === 'DAILY') {
                    nextDate.setDate(nextDate.getDate() + 1);
                } else if (recurrence.frequency === 'WEEKLY') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (recurrence.frequency === 'MONTHLY') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                if (nextDate > endDate || count >= MAX_EVENTS) break;

                eventsToInsert.push({
                    title: event.title,
                    description: event.description,
                    event_date: nextDate.toISOString(),
                    type: event.type,
                    recurrence_id: recurrenceId
                });
                count++;
            }
        }

        const { error } = await supabase
            .from('system_timeline')
            .insert(eventsToInsert);

        if (error) throw error;
    },

    async deleteTimelineEvent(id: string): Promise<void> {
        const { error } = await supabase
            .from('system_timeline')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async deleteTimelineSeries(recurrenceId: string): Promise<void> {
        const { error } = await supabase
            .from('system_timeline')
            .delete()
            .eq('recurrence_id', recurrenceId);
        if (error) throw error;
    },

    async updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<void> {
        const { error } = await supabase
            .from('system_timeline')
            .update({
                title: updates.title,
                description: updates.description,
                event_date: updates.date,
                type: updates.type
            })
            .eq('id', id);
        if (error) throw error;
    },

    // 3. Activity Feed (Unified & Hybrid)
    async getActivityFeed(userId?: string, isAdmin: boolean = false, fazendaId?: string, preloadedNuntecTransfers?: any[]): Promise<FeedItem[]> {
        const feedItems: FeedItem[] = [];

        // Requests
        try {
            let requestQuery = supabase
                .from('solicitacoes')
                .select(`
           id, numero, data_abertura, status, prioridade,
           solicitante:usuarios!usuario_id(nome), 
           filial:fazendas!fazenda_id(nome)
        `)
                .order('data_abertura', { ascending: false })
                .limit(15);

            if (!isAdmin && userId) {
                requestQuery = requestQuery
                    .eq('usuario_id', userId)
                    .eq('status', 'Finalizado');
            }

            const { data: requests, error } = await requestQuery;

            if (!error && requests) {
                const titlePrefix = (!isAdmin && userId) ? 'Concluída SC' : 'Nova SC';
                const type = (!isAdmin && userId) ? 'REQUEST_UPDATE' : 'REQUEST_NEW';

                feedItems.push(...requests.map((req: any) => ({
                    id: `req-${req.id}`,
                    type: type as any,
                    title: `${titlePrefix} #${req.numero || req.id.substring(0, 4)}`,
                    subtitle: `${req.solicitante?.nome?.split(' ')[0] || 'Usuário'} - ${req.filial?.nome || 'Geral'}`,
                    timestamp: req.data_abertura,
                    link: '/solicitacoes',
                    priority: (req.prioridade === 'Urgente' ? 'high' : 'normal') as 'high' | 'normal'
                })));
            }
        } catch (e) {
            console.warn("Feed request fetch error", e);
        }

        // Nuntec (Use preloaded or Fetch)
        if (isAdmin || fazendaId) {
            try {
                let visibleTransfers: any[] = [];

                if (preloadedNuntecTransfers) {
                    visibleTransfers = preloadedNuntecTransfers;
                } else {
                    const postos = await fuelService.getPostos();
                    const configuredPostos = postos.filter(p => p.nuntec_reservoir_id);

                    if (configuredPostos.length > 0) {
                        const abastecimentos = await fuelService.getAbastecimentos();
                        const transfers = await nuntecService.getPendingTransfers(configuredPostos, abastecimentos);

                        visibleTransfers = transfers;

                        if (fazendaId) {
                            const visibleResIds = new Set(
                                configuredPostos.filter(p => p.fazenda_id === fazendaId).map(p => String(p.nuntec_reservoir_id))
                            );
                            visibleTransfers = transfers.filter(t => visibleResIds.has(String(t['pointing-in']['reservoir-id'])));
                        } else if (!isAdmin) {
                            visibleTransfers = [];
                        }
                    }
                }

                feedItems.push(...visibleTransfers.map((t: any) => ({
                    id: `nuntec-${t['pointing-in'].id || t.id}`,
                    type: 'FUEL_PENDING',
                    title: `Pendente Nuntec`,
                    subtitle: `${Math.round(Math.abs(t['pointing-in'].amount))}L - Tanque`,
                    timestamp: t['end-at'] || t['start-at'] || new Date().toISOString(),
                    link: '/abastecimentos',
                    priority: 'normal'
                } as FeedItem)));
            } catch (e) {
                console.warn("Feed nuntec fetch error", e);
            }
        }

        return feedItems
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);
    },

    // 4. Optimized Unified Fetch
    async getDashboardOverview(userId: string, isAdmin: boolean, fazendaId?: string) {
        // Cache Check
        if (_dashboardCache &&
            _dashboardCache.keys.userId === userId &&
            _dashboardCache.keys.isAdmin === isAdmin &&
            _dashboardCache.keys.fazendaId === fazendaId &&
            (Date.now() - _dashboardCache.timestamp < CACHE_TTL)) {
            return _dashboardCache.data;
        }

        // 1. Fetch Nuntec Data (Common Heavy Operation)
        let nuntecTransfers: any[] = [];
        let nuntecStats = {
            pendingVolume: 0,
            pendingCount: 0,
            byStation: [] as any[]
        };

        try {
            const allPostos = await fuelService.getPostos();
            const farmPostos = fazendaId ? allPostos.filter(p => p.fazenda_id === fazendaId) : allPostos;
            // Filter: Only Virtual stations (Gerentes) with Nuntec Config
            const configuredVirtualPostos = farmPostos.filter(p => p.nuntec_reservoir_id && p.tipo === 'VIRTUAL');
            // Fix: Explicitly look for PHYSICAL stations for the monitoring widget
            const configuredPhysicalPostos = farmPostos.filter(p => p.nuntec_reservoir_id && p.tipo !== 'VIRTUAL');

            if (configuredVirtualPostos.length > 0 || configuredPhysicalPostos.length > 0) {
                // Fetch everything needed for health + pending volume
                // 0. Fetch existing fuelings first (needed for deduplication)
                // Filter by Nuntec Sync Start Date to avoid fetching unnecessary history
                // and to ensure we get exactly the relevant window.
                const config = await nuntecService.getConfig();
                const startDate = config?.START_DATE_SYNC ? config.START_DATE_SYNC.split('T')[0] : '2026-01-01'; // Fallback to Jan 1st

                // Also fetch ignored transfers to exclude them
                const [abastecimentos, ignoredTransfers] = await Promise.all([
                    fuelService.getAbastecimentos({ dataInicio: startDate }),
                    db.getIgnoredNuntecTransfers()
                ]);

                const ignoredSet = new Set(ignoredTransfers);

                // Fetch everything else needed for health + pending volume
                const [
                    measurements,
                    stationDataItems,
                    consumptions,
                    pendingTransfers
                ] = await Promise.all([
                    nuntecService.getStockMeasurements(),
                    nuntecService.getStationsData(),
                    nuntecService.getConsumptions(7),
                    // Only fetch pending transfers for VIRTUAL stations (optimization)
                    configuredVirtualPostos.length > 0
                        ? nuntecService.getPendingTransfers(configuredVirtualPostos, abastecimentos)
                        : Promise.resolve([])
                ]);

                // 1. Calculate Pending Volume (Original logic)
                // Filter pending transfers again just to be safe with visibility AND remove ignored
                const visiblePending = pendingTransfers.filter(t =>
                    configuredVirtualPostos.some(p => String(p.nuntec_reservoir_id) === String(t['pointing-in']['reservoir-id'])) &&
                    !ignoredSet.has(t.id)
                );

                nuntecStats.pendingVolume = visiblePending.reduce((acc, curr) => acc + Math.abs(curr['pointing-in'].amount), 0);
                nuntecStats.pendingCount = visiblePending.length;

                const statsMap = new Map<string, { volume: number; count: number }>();
                configuredVirtualPostos.forEach(p => {
                    // Safety check: Ensure the post actually belongs to the requested farm (if filter is active)
                    if (fazendaId && p.fazenda_id !== fazendaId) return;

                    const matchedPending = visiblePending.filter(t => String(t['pointing-in']['reservoir-id']) === String(p.nuntec_reservoir_id));
                    if (matchedPending.length > 0) {
                        const totalVol = matchedPending.reduce((sum, t) => sum + Math.abs(t['pointing-in'].amount), 0);
                        // Use Farm Name + Station Name to distinguish between farms in the overview
                        let farmName = '';
                        if (p.fazenda) {
                            if (Array.isArray(p.fazenda) && p.fazenda.length > 0) farmName = p.fazenda[0].nome;
                            else if (typeof p.fazenda === 'object' && 'nome' in p.fazenda) farmName = (p.fazenda as any).nome;
                        }

                        const name = farmName ? `${farmName} • ${p.nome}` : p.nome;
                        statsMap.set(name, { volume: totalVol, count: matchedPending.length });
                    }
                });
                nuntecStats.byStation = Array.from(statsMap.entries()).map(([name, data]) => ({ name, ...data }));

                // 2. Calculate Fuel Health for the specific farm
                // Include anything with a Nuntec ID that isn't explicitly VIRTUAL (So FISICO or undefined/legacy)

                const healthStations = configuredPhysicalPostos.map(posto => {
                    // Correct matching prioritizing direct Reservoir ID then Nozzle
                    // This prevents collisions if a Nozzle ID of one tank equals Reservoir ID of another
                    const reservoirData =
                        stationDataItems.find(r => String(r.id) === String(posto.nuntec_reservoir_id)) ||
                        stationDataItems.find(r => r.nozzleIds?.includes(String(posto.nuntec_reservoir_id)));

                    const measurement = measurements.find(m =>
                        String(m['reservoir-id']) === String(reservoirData?.id || posto.nuntec_reservoir_id)
                    );

                    const stock = reservoirData?.stock ?? measurement?.amount ?? 0;
                    const capacity = reservoirData?.capacity ?? 0;
                    const percentage = capacity > 0 ? (stock / capacity) * 100 : 0;

                    // Autonomy Logic (Matching StationManagement exactly)
                    const allMatchingIds = new Set<string>();
                    if (posto.nuntec_reservoir_id) allMatchingIds.add(String(posto.nuntec_reservoir_id));
                    if (reservoirData) {
                        allMatchingIds.add(String(reservoirData.id));
                        reservoirData.nozzleIds?.forEach(id => allMatchingIds.add(String(id)));
                    }

                    const stationConsumptions = consumptions.filter(t =>
                        allMatchingIds.has(String(t['reservoir-id'])) ||
                        allMatchingIds.has(String(t['nozzle-id']))
                    );
                    const totalVolume7Days = stationConsumptions.reduce((sum, t) => sum + t.amount, 0);
                    const dailyAvg = totalVolume7Days / 7;
                    const autonomyDays = dailyAvg > 0 ? stock / dailyAvg : undefined;

                    let status: 'ok' | 'warning' | 'critical' = 'ok';
                    if (percentage < 10 || (autonomyDays !== undefined && autonomyDays < 2)) status = 'critical';
                    else if (percentage < 20 || (autonomyDays !== undefined && autonomyDays < 5)) status = 'warning';

                    return {
                        id: posto.id,
                        nome: posto.nome,
                        currentStock: Math.round(stock),
                        capacity: Math.round(capacity),
                        percentage: Math.round(percentage),
                        autonomyDays: autonomyDays !== undefined ? Math.round(autonomyDays) : undefined,
                        lastMeasurement: measurement?.['measured-at'],
                        status
                    };
                });

                (nuntecStats as any).fuelHealth = { stations: healthStations };
            }
        } catch (e) {
            console.warn("Unified Nuntec Fetch Error", e);
        }

        // 2. Fetch Requests Stats & Feed (Parallel)
        // We reuse getGeneralStatsLogic but we need to inject the Nuntec values we already calculated to avoid re-fetching.
        // Or we can just call getGeneralStats but pass a "skipNuntec" flag or similar? 
        // Modifying getGeneralStats is invasive.
        // Alternative: Re-implement just the request fetching here OR modify getGeneralStats to accept optional overrides.

        // Let's modify getGeneralStats to accept partial overrides!

        const [stats, feed, timeline] = await Promise.all([
            this.getGeneralStats(fazendaId, nuntecStats),
            this.getActivityFeed(userId, isAdmin, fazendaId, nuntecTransfers),
            this.getTimelineEvents()
        ]);

        const result = { stats, feed, timeline };

        // Save to Cache
        _dashboardCache = {
            timestamp: Date.now(),
            data: result,
            keys: { userId, isAdmin, fazendaId }
        };

        return result;
    },

    // 5. Optimized Independent Nuntec Fetch
    async getNuntecPendingStats(userId: string, fazendaId?: string): Promise<{ pendingVolume: number, count: number, byStation: any[] }> {
        try {
            const allPostos = await fuelService.getPostos();
            const farmPostos = fazendaId ? allPostos.filter(p => p.fazenda_id === fazendaId) : allPostos;

            // Filter: Only Virtual stations (Gerentes) with Nuntec Config
            const configuredPostos = farmPostos.filter(p => p.nuntec_reservoir_id && p.tipo === 'VIRTUAL');

            if (configuredPostos.length === 0) {
                return { pendingVolume: 0, count: 0, byStation: [] };
            }

            const config = await nuntecService.getConfig();
            const startDate = config?.START_DATE_SYNC ? config.START_DATE_SYNC.split('T')[0] : '2026-01-01';

            // Parallel Request: Get Fuelings (DB) + Ignored (DB)
            const [abastecimentos, ignoredTransfers] = await Promise.all([
                fuelService.getAbastecimentos({ dataInicio: startDate }),
                db.getIgnoredNuntecTransfers()
            ]);

            // Use nuntecService default deduplication logic
            const pendingTransfers = await nuntecService.getPendingTransfers(configuredPostos, abastecimentos);

            const ignoredSet = new Set(ignoredTransfers);

            // Filter out ignored
            const visiblePending = pendingTransfers.filter(t => !ignoredSet.has(t.id));

            // Group by Station
            const statsMap = new Map<string, { volume: number; count: number }>();

            configuredPostos.forEach(p => {
                if (fazendaId && p.fazenda_id !== fazendaId) return;

                const stationPending = visiblePending.filter(t => String(t['pointing-in']['reservoir-id']) === String(p.nuntec_reservoir_id));

                if (stationPending.length > 0) {
                    const totalVol = stationPending.reduce((sum, t) => sum + Math.abs(t['pointing-in'].amount), 0);

                    let farmName = '';
                    if (p.fazenda) {
                        if (Array.isArray(p.fazenda) && p.fazenda.length > 0) farmName = p.fazenda[0].nome;
                        else if (typeof p.fazenda === 'object' && 'nome' in p.fazenda) farmName = (p.fazenda as any).nome;
                    }

                    const name = farmName ? `${farmName} • ${p.nome}` : p.nome;
                    statsMap.set(name, { volume: totalVol, count: stationPending.length });
                }
            });

            const pendingVolume = visiblePending.reduce((acc, curr) => acc + Math.abs(curr['pointing-in'].amount), 0);

            return {
                pendingVolume: Math.round(pendingVolume),
                count: visiblePending.length,
                byStation: Array.from(statsMap.entries()).map(([name, data]) => ({ name, ...data }))
            };

        } catch (error) {
            console.error('Error fetching Nuntec Stats:', error);
            // Fallback: If error, try to return empty but defined
            return { pendingVolume: 0, count: 0, byStation: [] };
        }
    }
};
