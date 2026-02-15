import { nuntecService } from './nuntecService';

export interface AuditItem {
    id: string | null;
    invoiceNumber: string;
    status: string; // 'MISSING_ANALYSIS', 'ANALYZED'
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
            console.log('Fetching Audit Data via Client-Side nuntecService...');

            // Use client-side logic directly
            const result = await nuntecService.getAuditData();

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

// Mock Data for Local Development
function mockAuditData(): AuditResponse {
    const mockItems: AuditItem[] = [
        {
            id: '1',
            invoiceNumber: '153912',
            status: 'ANALYZED',
            date: '2026-02-12T10:15:54-03:00',
            unit_id: 'Fazenda Caregi',
            volume: 15000,
            difference: 54.28,
            differencePercent: 0.36,
            conformity: 'conforming',
            analysis: { density: 0.8347, temperature: 28.5, volume: 15054.28, weight: 0, date: '2026-02-12T10:15:54-03:00' }
        },
        {
            id: '2',
            invoiceNumber: '22898',
            status: 'ANALYZED',
            date: '2026-02-11T17:23:40-03:00',
            unit_id: 'Fazenda Sulinense',
            volume: 10000,
            difference: -150,
            differencePercent: 1.5,
            conformity: 'non_conforming',
            analysis: { density: 0.8100, temperature: 27.5, volume: 9850, weight: 0, date: '2026-02-11T17:23:40-03:00' }
        },
        {
            id: '3',
            invoiceNumber: '99999',
            status: 'MISSING_ANALYSIS',
            date: '2026-02-10T12:00:00-03:00',
            unit_id: 'Fazenda Tunica',
            volume: 5000,
            difference: 0,
            differencePercent: 0,
            conformity: 'unknown',
            analysis: undefined
        }
    ];

    // Generate more mock items
    for (let i = 4; i <= 25; i++) {
        const isProblem = Math.random() > 0.7;
        const volume = Math.floor(Math.random() * 10000) + 5000;
        const diff = isProblem ? (Math.random() * 200 - 100) : (Math.random() * 20 - 10);

        mockItems.push({
            id: i.toString(),
            invoiceNumber: `${150000 + i}`,
            status: isProblem ? 'ANALYZED' : 'ANALYZED',
            date: new Date(Date.now() - i * 86400000).toISOString(),
            unit_id: i % 2 === 0 ? 'Fazenda Caregi' : 'Fazenda Tunica',
            volume: volume,
            difference: diff,
            differencePercent: (Math.abs(diff) / volume) * 100,
            conformity: isProblem && Math.random() > 0.5 ? 'non_conforming' : 'conforming',
            analysis: {
                density: 0.83 + (Math.random() * 0.02),
                temperature: 20 + Math.random() * 10,
                volume: volume + diff,
                weight: 0,
                date: new Date(Date.now() - i * 86400000).toISOString()
            }
        });
    }

    return {
        timestamp: new Date().toISOString(),
        stats: {
            totalVolume: mockItems.reduce((acc, i) => acc + i.volume, 0),
            analysisCoverage: 95,
            totalDifference: mockItems.reduce((acc, i) => acc + i.difference, 0),
            totalAnalyzed: mockItems.length - 1,
            totalCount: mockItems.length
        },
        data: mockItems
    };
}
