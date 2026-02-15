import React, { useEffect, useState, useCallback } from 'react';
import {
    Home,
    Droplet,
    FileText,
    Clock,
    AlertCircle,
    Bell,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Filter,
    Plus,
    Trash2,
    PieChart,
    RefreshCw
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { dashboardService, DashboardStats, FeedItem, TimelineEvent } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInSystemTime } from '../utils/dateUtils';
import { Link, useNavigate } from 'react-router-dom';
import { TimelineModal } from '../components/TimelineModal';
import { TimelineItem } from '../components/dashboard/TimelineItem';
import { FeedItemCard } from '../components/dashboard/FeedItemCard';
import { FuelMonitoringWidget } from '../components/dashboard/FuelMonitoringWidget';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';

/* --- Sub-components --- */



/* --- Main Page Component --- */

export function HomeDashboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();

    // State
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

    const isAdmin = role?.nome === 'Administrador';
    const hasPriorityData = stats?.scPriorityDistribution.some(d => d.value > 0);

    // Helper to get current scope
    const getEffectiveFarmId = useCallback(() => {
        if (user?.fazenda_id) return user.fazenda_id; // Always prioritize assigned farm

        // For Admins/Multi-farm users, check local storage filter
        try {
            const stored = localStorage.getItem('selectedFarm');
            if (stored && stored !== 'all') return stored;
        } catch (e) {
            console.error(e);
        }
        return undefined;
    }, [user]);

    const loadData = useCallback(async () => {
        if (!user) return;
        const currentFarmId = getEffectiveFarmId();

        try {
            const { stats, feed, timeline } = await dashboardService.getDashboardOverview(user.id, isAdmin, currentFarmId);
            setStats(stats);
            setFeed(feed);
            setTimeline(timeline);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, getEffectiveFarmId]);

    // Separate state for Nuntec to allow async loading without blocking main dash
    const [nuntecStats, setNuntecStats] = useState<{ pendingVolume: number; count: number; byStation: any[] } | null>(null);
    const [loadingNuntec, setLoadingNuntec] = useState(true);

    const loadNuntec = useCallback(async () => {
        if (!user) return;
        setLoadingNuntec(true);
        const currentFarmId = getEffectiveFarmId();

        try {
            const data = await dashboardService.getNuntecPendingStats(user.id, currentFarmId);
            setNuntecStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingNuntec(false);
        }
    }, [user, getEffectiveFarmId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadNuntec();
    }, [loadNuntec]);

    const handleSaveTimeline = async (event: Omit<TimelineEvent, 'id'>, recurrence?: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY', until: string }) => {
        await dashboardService.createTimelineEvent(event, recurrence);
        const newEvents = await dashboardService.getTimelineEvents();
        setTimeline(newEvents);
    };

    const handleDeleteTimeline = async (id: string, recurrenceId?: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta atividade?')) return;

        try {
            // TODO: Implement "Process Series" logic if needed (delete all future events?)
            // For now, we delete the specific occurrence
            await dashboardService.deleteTimelineEvent(id);
            const newEvents = await dashboardService.getTimelineEvents();
            setTimeline(newEvents);
        } catch (error) {
            console.error("Error deleting timeline event:", error);
            alert("Erro ao excluir atividade. Tente novamente.");
        }
    };

    // ... [Rest of handlers remain same] ...

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* ... Header ... */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <PageHeader
                    title={`Olá, ${user?.nome?.split(' ')[0] || 'Usuário'}`}
                    subtitle="Visão geral e pendências do sistema"
                    icon={Home}
                >
                    <div className="text-right hidden sm:block">
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-400 font-medium">
                            <span className="capitalize">{formatInSystemTime(new Date(), "EEEE, d 'de' MMMM")}</span>
                            <button
                                onClick={() => { loadData(); loadNuntec(); }}
                                disabled={loading}
                                className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${loading || loadingNuntec ? 'animate-spin' : ''}`}
                                title="Atualizar dados"
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Última atualização: <span className="font-mono">{formatInSystemTime(new Date(), "HH:mm")}</span>
                        </p>
                    </div>
                </PageHeader>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatsCard
                        title="Pendências Gerente"
                        value={loadingNuntec ? '...' : `${nuntecStats?.pendingVolume || 0} L`}
                        icon={Droplet}
                        variant="orange"
                        description={
                            loadingNuntec ? (
                                <span className="text-xs text-slate-400">Atualizando...</span>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <span>Pendente na sua conta • {nuntecStats?.count || 0} Baixas</span>
                                    {nuntecStats?.byStation && nuntecStats.byStation.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-orange-200/50 flex flex-col gap-0.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                                            {nuntecStats.byStation.map(s => (
                                                <span key={s.name} className="flex justify-between items-center text-[10px]">
                                                    <span className="truncate max-w-[150px]" title={s.name}>{s.name}</span>
                                                    <span className="font-bold whitespace-nowrap">{Math.round(s.volume)}L ({s.count})</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        }
                        className={`ring-2 ring-orange-200 transition-opacity ${loadingNuntec ? 'opacity-70' : 'opacity-100'}`}
                        onClick={() => navigate('/abastecimentos?view=integration')}
                    />
                    <StatsCard
                        title="Cadastros (Mês)"
                        value={stats?.monthlyRequests || 0}
                        icon={FileText}
                        variant="blue"
                        description={`Novas solicitações • ${stats?.monthlyItems || 0} Itens`}
                        className="ring-2 ring-blue-200"
                        onClick={() => navigate('/solicitacoes')}
                    />
                    <StatsCard
                        title="Tempo Médio"
                        value={stats?.avgResolutionTime || '-'}
                        icon={Clock}
                        variant="green"
                        description="Resolução de SCs"
                        className="ring-2 ring-green-200"
                        onClick={() => navigate('/solicitacoes')}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Left Column (2/3) */}
                    <div className="lg:col-span-2 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fuel Monitoring Widget (Replaces Priority Chart) */}
                            <FuelMonitoringWidget stations={stats?.fuelHealth?.stations || []} />

                            {/* Timeline */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px] hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar size={18} className="text-slate-400" />
                                        Atividades
                                    </h3>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsTimelineModalOpen(true)}
                                            title="Adicionar Evento"
                                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-full text-slate-400 transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2 flex-1 relative custom-scrollbar overflow-y-auto max-h-[400px] pr-2">
                                    {timeline.length > 0 ? (
                                        timeline.map((event, idx) => (
                                            <TimelineItem
                                                key={event.id}
                                                event={event}
                                                isLast={idx === timeline.length - 1}
                                                onDelete={isAdmin ? () => handleDeleteTimeline(event.id, event.recurrence_id) : undefined}
                                            />
                                        ))
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                <Calendar size={24} className="text-slate-300" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-400">Nenhuma atividade futura</p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => setIsTimelineModalOpen(true)}
                                                    className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                                                >
                                                    + Adicionar agora
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3) - Feed */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px] sticky top-6 hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Bell size={18} className="text-slate-400" />
                                    Movimentações
                                </h3>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Últimas 24h</span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                {feed.length > 0 ? (
                                    feed.map(item => <FeedItemCard key={item.id} item={item} />)
                                ) : (
                                    <div className="text-center py-10 h-full flex flex-col justify-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">Tudo calmo por aqui</p>
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TimelineModal
                isOpen={isTimelineModalOpen}
                onClose={() => setIsTimelineModalOpen(false)}
                onSave={handleSaveTimeline}
            />
        </div>
    );
}

export default HomeDashboard;
