import { db } from './supabaseService';
import { supabase } from '../lib/supabase';

export interface FeedItem {
    id: string;
    type: 'request' | 'nuntec' | 'system';
    title: string;
    description: string;
    timestamp: Date;
    link?: string;
    priority?: 'high' | 'normal' | 'low';
}

export interface TimelineEvent {
    id: string;
    title: string;
    date: Date;
    type: 'meeting' | 'task' | 'reminder';
    description?: string;
    recurrence_id?: string;
}

export interface DashboardStats {
    overview: {
        total_requests: number;
        total_items: number;
        pending_count: number;
        finished_count: number;
        avg_sla_hours: number;
        avg_items_per_request: number;
    };
    charts: {
        by_classification: { name: string; value: number }[];
        by_priority: { name: string; value: number }[];
        by_user: { name: string; requests: number; items: number }[];
        by_farm: { id: string; name: string; value: number }[];
        daily_volume: { date: string; total: number; finished: number; returned: number }[];
    };
    // New fields for HomeDashboard
    monthlyRequests?: number;
    monthlyItems?: number;
    avgResolutionTime?: string;
    scPriorityDistribution: { name: string; value: number }[];
    fuelHealth?: {
        stations: { id: string; nome: string; status: 'ok' | 'warning' | 'critical'; currentStock: number; capacity: number; percentage: number; lastUpdate: Date }[];
    };
}

export const dashboardService = {
    async getRequestStats(startDate: Date, endDate: Date, fazendaId?: string): Promise<DashboardStats> {
        try {
            // Format dates to YYYY-MM-DD
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];

            const { data, error } = await supabase.rpc('get_request_dashboard_stats', {
                start_date: start,
                end_date: end,
                filter_fazenda_id: fazendaId || null
            });

            if (error) throw error;

            return data as DashboardStats;
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            throw error;
        }
    },

    // New methods for Home Dashboard (Placeholder/Mock implementations for now)
    async getDashboardOverview(userId: string, isAdmin: boolean, farmId?: string): Promise<{ stats: DashboardStats, feed: FeedItem[], timeline: TimelineEvent[] }> {
        // In a real scenario, this would call an RPC or multiple queries
        // Returning mock data to satisfy build
        return {
            stats: {
                overview: { total_requests: 0, total_items: 0, pending_count: 0, finished_count: 0, avg_sla_hours: 0, avg_items_per_request: 0 },
                charts: { by_classification: [], by_priority: [], by_user: [], by_farm: [], daily_volume: [] },
                monthlyRequests: 0,
                monthlyItems: 0,
                avgResolutionTime: '0h',
                scPriorityDistribution: [],
                fuelHealth: { stations: [] }
            },
            feed: [],
            timeline: []
        };
    },

    async getNuntecPendingStats(userId: string, farmId?: string): Promise<{ pendingVolume: number; count: number; byStation: any[] }> {
        return { pendingVolume: 0, count: 0, byStation: [] };
    },

    async getActivityFeed(userId: string, isAdmin: boolean, farmId?: string): Promise<FeedItem[]> {
        return [];
    },

    async createTimelineEvent(event: any, recurrence?: any): Promise<void> {
        // Placeholder
    },

    async getTimelineEvents(): Promise<TimelineEvent[]> {
        return [];
    },

    async deleteTimelineEvent(id: string): Promise<void> {
        // Placeholder
    }
};
