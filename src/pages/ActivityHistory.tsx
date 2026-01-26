import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { dashboardService, FeedItem } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { FeedItemCard } from '../components/dashboard/FeedItemCard';
import { History, Search, Calendar } from 'lucide-react';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';

export function ActivityHistory() {
    const { user, role } = useAuth();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = role?.nome === 'Administrador';

    useEffect(() => {
        const loadData = async () => {
            if (user) {
                try {
                    const data = await dashboardService.getActivityFeed(user.id, isAdmin, user.fazenda_id);
                    setFeed(data);
                } catch (error) {
                    console.error("Failed to load history", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [user, isAdmin]);

    const filteredFeed = feed.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <PageHeader
                title="Histórico de Atividades"
                subtitle="Visão geral de todas as movimentações"
                icon={History}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar no histórico..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="text-xs text-slate-400 font-medium ml-auto">
                            {filteredFeed.length} registros encontrados
                        </div>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-slate-100">
                        {filteredFeed.length > 0 ? (
                            filteredFeed.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <FeedItemCard item={item} />
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
                                <History size={48} className="text-slate-200 mb-4" />
                                <p>Nenhuma atividade encontrada.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
