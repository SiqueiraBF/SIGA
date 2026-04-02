import type { AuditItem, AuditResponse } from './auditService';

/**
 * Mock data for local development and API fallback.
 * Isolated here to avoid inflating the production bundle.
 * DT-04 fix: moved from auditService.ts.
 */
export function mockAuditData(): AuditResponse {
    const mockItems: AuditItem[] = [
        {
            id: '1',
            invoiceNumber: '153912',
            status: 'ANALYZED',
            date: '2026-02-12T10:15:54-03:00',
            unit_id: 'Fazenda Caregi',
            farm_name: 'Fazenda Caregi',
            fuel_name: 'Diesel S10',
            volume: 15000,
            difference: 54.28,
            differencePercent: 0.36,
            conformity: 'conforming',
            analysis: {
                density: 0.8347,
                temperature: 28.5,
                volume: 15054.28,
                weight: 0,
                date: '2026-02-12T10:15:54-03:00',
                supplier_name: 'Petrobras Distribuidora',
                gross_weight: 28600,
                tare: 13500,
                net_weight: 15100,
                ticket_number: 'TKT-00234',
                density_20c: 0.8310,
                volume_20c: 15028.5
            }
        },
        {
            id: '2',
            invoiceNumber: '22898',
            status: 'ANALYZED',
            date: '2026-02-11T17:23:40-03:00',
            unit_id: 'Fazenda Sulinense',
            farm_name: 'Fazenda Sulinense',
            fuel_name: 'Diesel S10',
            volume: 10000,
            difference: -150,
            differencePercent: 1.5,
            conformity: 'non_conforming',
            analysis: {
                density: 0.8100,
                temperature: 27.5,
                volume: 9850,
                weight: 0,
                date: '2026-02-11T17:23:40-03:00',
                supplier_name: 'Raízen',
                gross_weight: 23000,
                tare: 13000,
                net_weight: 10000,
                ticket_number: 'TKT-00198',
                density_20c: 0.8078,
                volume_20c: 9830
            }
        },
        {
            id: '3',
            invoiceNumber: '99999',
            status: 'MISSING_ANALYSIS',
            date: '2026-02-10T12:00:00-03:00',
            unit_id: 'Fazenda Tunica',
            farm_name: 'Fazenda Tunica',
            fuel_name: 'Arla 32',
            volume: 5000,
            difference: 0,
            differencePercent: 0,
            conformity: 'unknown',
            analysis: undefined
        }
    ];

    // Generate diverse mock items — DT-05 fix: ternary now correctly produces MISSING_ANALYSIS
    for (let i = 4; i <= 25; i++) {
        const isProblem = Math.random() > 0.7;
        const isMissingAnalysis = Math.random() > 0.85; // ~15% sem análise
        const volume = Math.floor(Math.random() * 10000) + 5000;
        const diff = isProblem ? (Math.random() * 200 - 100) : (Math.random() * 20 - 10);

        mockItems.push({
            id: i.toString(),
            invoiceNumber: `${150000 + i}`,
            // DT-05 fix: was `isProblem ? 'ANALYZED' : 'ANALYZED'` — always ANALYZED
            status: isMissingAnalysis ? 'MISSING_ANALYSIS' : 'ANALYZED',
            date: new Date(Date.now() - i * 86400000).toISOString(),
            unit_id: i % 2 === 0 ? 'Fazenda Caregi' : 'Fazenda Tunica',
            farm_name: i % 2 === 0 ? 'Fazenda Caregi' : 'Fazenda Tunica',
            fuel_name: i % 3 === 0 ? 'Arla 32' : 'Diesel S10',
            volume: volume,
            difference: isMissingAnalysis ? 0 : diff,
            differencePercent: isMissingAnalysis ? 0 : (Math.abs(diff) / volume) * 100,
            conformity: isMissingAnalysis ? 'unknown' : (isProblem && Math.random() > 0.5 ? 'non_conforming' : 'conforming'),
            analysis: isMissingAnalysis ? undefined : {
                density: 0.83 + (Math.random() * 0.02),
                temperature: 20 + Math.random() * 10,
                volume: volume + diff,
                weight: 0,
                date: new Date(Date.now() - i * 86400000).toISOString(),
                supplier_name: i % 2 === 0 ? 'Petrobras Distribuidora' : 'Raízen',
                density_20c: 0.827 + (Math.random() * 0.02),
                volume_20c: volume + diff - (Math.random() * 5)
            }
        });
    }

    return {
        timestamp: new Date().toISOString(),
        stats: {
            totalVolume: mockItems.reduce((acc, i) => acc + i.volume, 0),
            analysisCoverage: (mockItems.filter(i => i.status === 'ANALYZED').length / mockItems.length) * 100,
            totalDifference: mockItems.reduce((acc, i) => acc + i.difference, 0),
            totalAnalyzed: mockItems.filter(i => i.status === 'ANALYZED').length,
            totalCount: mockItems.length
        },
        data: mockItems
    };
}
