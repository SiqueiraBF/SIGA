import { mockAuditData } from './auditService.mock';

export interface AuditItem {
    id: string | null;
    invoiceNumber: string;
    status: string; // 'MISSING_ANALYSIS' | 'ANALYZED' | 'MISSING_ENTRY'
    date: string;
    unit_id: string; // Renamed from unit to match nuntecService
    station_name?: string; // Internal Station Name (Posto)
    farm_name?: string; // Internal Farm Name (Filial)
    fuel_name?: string; // Fuel Type (e.g. Diesel S10)
    volume: number;
    difference: number;
    differencePercent: number;
    conformity: string;
    analysis?: {
        id?: string; // Analysis ID
        date: string;
        density: number; // Current Density
        temperature: number;
        volume: number; // Volume @ Current Temp (Physical)
        weight: number;
        // Extended Fields
        supplier_name?: string;
        gross_weight?: number;
        tare?: number;
        net_weight?: number;
        ticket_number?: string;
        density_20c?: number;
        volume_20c?: number; // Volume @ 20C
    };
    groupedSupplies?: {
        id: string;
        invoiceNumber: string;
        volume: number;
        date: string;
    }[];
}

export interface AuditStats {
    totalVolume: number;
    totalDifference: number;
    analysisCoverage: number;
    totalAnalyzed: number;
    totalCount: number;
}

export interface AuditResponse {
    timestamp: string;
    stats: AuditStats;
    data: AuditItem[];
    isSystemMock?: boolean;
}

export const auditService = {
    async getAuditData(): Promise<AuditResponse> {
        try {
            console.log('Fetching Audit Data via Serverless Proxy...');

            // Forward the Nuntec complexity to Supabase Edge Function
            const { supabase } = await import('../lib/supabase');
            
            const { data, error } = await supabase.functions.invoke('audit', {
                method: 'GET'
            });

            if (error) {
                throw new Error(error.message || 'Edge Function failed to resolve XML payload.');
            }

            return {
                timestamp: data.timestamp || new Date().toISOString(),
                stats: data.stats as AuditStats,
                data: data.data as AuditItem[],
                isSystemMock: false
            };

        } catch (error: any) {
            console.error('Error fetching audit data (Client-Side):', error);
            throw new Error(error.message || 'Falha ao sincronizar e carregar os dados de auditoria.');
        }
    }
};
