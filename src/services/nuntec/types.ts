
import { NuntecAdmeasurement, NuntecConsumption, NuntecMeasurement, NuntecPointing, NuntecReservoir, NuntecTransfer, Veiculo } from '../../types';

export interface NuntecConfig {
    BASE_URL: string;
    START_DATE_SYNC: string;
    AUTH_USER: string;
    AUTH_PASS: string;
}

export const DEFAULTS = {
    BASE_URL: '/api/nuntec',
    START_DATE_SYNC: '2026-01-01T00:00:00',
    AUTH_USER: 'bruno.siqueira',
    AUTH_PASS: '98765412',
};

// Specific type for Audit/Analysis (Supply Weight Measurement)
export interface NuntecAuditMeasurement {
    id: string;
    invoiceNumber: string;
    date: string;
    density: number;
    temperature: number;
    volume: number;
    weight: number;
    xmlDifference?: string;
    supplier_name?: string;
    fuel_name?: string;
    gross_weight?: number;
    tare?: number;
    net_weight?: number;
    ticket_number?: string;
    density_20c?: number;
    volume_20c?: number;
    fuel_id?: string;
}

export interface NuntecFueling {
    id: string;
    stationId: string;
    vehicleId: string;
    operatorId: string;
    reservoirId?: string; // Added for precise filtering
    date: string;
    amount: number;
    hourmeter: number;
    odometer: number; // Assuming this exists or we map it
    vehicleName?: string;
    stationName?: string;
    operatorName?: string;
}

// Re-export core types for convenience within the module
export type { NuntecAdmeasurement, NuntecConsumption, NuntecMeasurement, NuntecPointing, NuntecReservoir, NuntecTransfer, Veiculo };
