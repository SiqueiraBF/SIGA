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

            // Forward the Nuntec complexity to Vercel Node Engine
            const response = await fetch('/api/audit');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Serverless Proxy failed to resolve XML payload.');
            }

            const result = await response.json();

            return {
                timestamp: new Date().toISOString(),
                stats: result.stats as AuditStats,
                data: result.data as AuditItem[],
                isSystemMock: false
            };

        } catch (error) {
            console.error('Error fetching audit data (Client-Side):', error);
            console.warn('Falling back to Mock Data.');
            const mock = mockAuditData();
            return { ...mock, isSystemMock: true };
        }
    }
};
