
import { getVehiclesService } from './nuntec/vehicles';
import { getStockMeasurementsService } from './nuntec/stock';
import { getAuditDataService } from './nuntec/audit';
import { getFuelingConsistencyService } from './nuntec/fueling';
// Placeholder exports until we migrate everything
import { nuntecService as legacyService } from './nuntecService.legacy';

export const nuntecService = {
  getVehicles: getVehiclesService,
  getStockMeasurements: getStockMeasurementsService,
  getAuditData: getAuditDataService,
  getFuelingConsistency: getFuelingConsistencyService,

  // Forward legacy methods until fully migrated
  getStationsData: legacyService.getStationsData.bind(legacyService),
  getAdmeasurements: legacyService.getAdmeasurements.bind(legacyService),
  getConsumptions: legacyService.getConsumptions.bind(legacyService),
  getPendingTransfers: legacyService.getPendingTransfers.bind(legacyService),

  // Additional legacy methods required
  testConnection: legacyService.testConnection.bind(legacyService),
  repairAllMissingData: legacyService.repairAllMissingData.bind(legacyService),
  repairFuelingData: legacyService.repairFuelingData.bind(legacyService),
  createFueling: legacyService.createFueling.bind(legacyService),
  getConfig: legacyService.getConfig.bind(legacyService)
};

export * from './nuntec/types';
