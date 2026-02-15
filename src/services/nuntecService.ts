import { Abastecimento, Posto, NuntecTransfer, NuntecPointing, NuntecMeasurement, NuntecReservoir, NuntecAdmeasurement, NuntecConsumption, Veiculo } from '../types';
import { db } from './supabaseService';
import { supabase } from '../lib/supabase';
import { format, parseISO, subHours } from 'date-fns';

// Constants configuration
const DEFAULTS = {
  BASE_URL: '/api/nuntec',
  START_DATE_SYNC: '2026-01-01T00:00:00',
  AUTH_USER: 'bruno.siqueira',
  AUTH_PASS: '98765412',
};

// Simple in-memory cache for operator names
const operatorCache = new Map<string, string>();

/**
 * Service to handle Nuntec API integration
 */
export const nuntecService = {
  /**
    * Fetches and cross-references detailed audit data (Analysis vs Supplies).
    * Logic moved to client-side to avoid serverless function complexity.
    */
  async getAuditData(): Promise<{ stats: any; data: any[] }> {
    const config = await this.getConfig();
    if (!config) return { stats: {}, data: [] };

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      // Fetch last 30 days by default (or configure)
      const now = new Date();
      const sinceDate = subHours(now, 30 * 24); // 30 days
      const since = format(sinceDate, "yyyy-MM-dd'T'HH:mm:ss");

      // Fetch Analysis, Supplies, Companies, Internal Stations, Fuels, AND Suppliers
      const [analysisRes, suppliesRes, companiesRes, internalStationsRes, fuelsRes, suppliersRes] = await Promise.all([
        fetch(`${config.BASE_URL}/supply_weight_measurements.xml?created_at=${since}`, { headers }),
        fetch(`${config.BASE_URL}/supplies.xml?created_at=${since}`, { headers }),
        fetch(`${config.BASE_URL}/companies.xml`, { headers }), // Fetch companies for mapping
        supabase.from('postos').select('id, nome, nuntec_reservoir_id, fazenda:fazendas(nome)').not('nuntec_reservoir_id', 'is', null), // Fetch internal stations
        fetch(`${config.BASE_URL}/fuels.xml`, { headers }), // Fetch Fuels
        fetch(`${config.BASE_URL}/suppliers.xml`, { headers }) // Fetch Suppliers
      ]);

      if (!analysisRes.ok || !suppliesRes.ok) {
        console.warn("Falha ao buscar dados da Nuntec para auditoria.");
        return { stats: {}, data: [] };
      }

      const analysisText = await analysisRes.text();
      const suppliesText = await suppliesRes.text();
      const companiesText = await companiesRes.text();
      const fuelsText = await fuelsRes.text();
      const suppliersText = await suppliersRes.text();

      // Map Internal Stations
      const internalStationMap = new Map<string, { station: string, farm: string }>();
      if (internalStationsRes.data) {
        internalStationsRes.data.forEach((p: any) => {
          if (p.nuntec_reservoir_id) {
            internalStationMap.set(String(p.nuntec_reservoir_id), {
              station: p.nome,
              farm: p.fazenda?.nome || 'Fazenda Desconhecida'
            });
          }
        });
      }

      if (analysisText.includes('<html') || suppliesText.includes('<html')) {
        throw new Error("API retornou HTML (Provável erro de autenticação)");
      }

      const parser = new DOMParser();
      const analysisDoc = parser.parseFromString(analysisText, 'text/xml');
      const suppliesDoc = parser.parseFromString(suppliesText, 'text/xml');

      // Helper to get Reservoir -> Station Name map (Nuntec Native)
      const locationMap = await this.getReservoirLocationMap(headers, config);

      // Helper: Parse Companies Map
      const companiesMap = new Map<string, string>();
      try {
        const compDoc = parser.parseFromString(companiesText, 'text/xml');
        const compNodes = compDoc.getElementsByTagName('company');
        for (let i = 0; i < compNodes.length; i++) {
          const id = getTagValue(compNodes[i], 'id');
          const name = getTagValue(compNodes[i], 'name');
          if (id && name) companiesMap.set(id, name);
        }
      } catch (e) { console.warn("Failed to parse companies", e); }

      // Helper: Parse Fuels Map
      const fuelsMap = new Map<string, string>();
      // Manual Fallbacks (Requested by User)
      fuelsMap.set('2', 'Óleo Diesel');
      fuelsMap.set('4', 'Gasolina Comum');
      fuelsMap.set('5', 'Querosene');
      fuelsMap.set('6', 'AVGAS');

      try {
        const fuelDoc = parser.parseFromString(fuelsText, 'text/xml');
        const fuelNodes = fuelDoc.getElementsByTagName('fuel');
        for (let i = 0; i < fuelNodes.length; i++) {
          const id = getTagValue(fuelNodes[i], 'id');
          const name = getTagValue(fuelNodes[i], 'name');
          if (id && name) fuelsMap.set(id, name); // API overwrites manual if available
        }
      } catch (e) { console.warn("Failed to parse fuels", e); }

      // Helper: Parse Suppliers Map
      const suppliersMap = new Map<string, string>();
      try {
        const supDoc = parser.parseFromString(suppliersText, 'text/xml');
        let supNodes = supDoc.getElementsByTagName('supplier');
        for (let i = 0; i < supNodes.length; i++) {
          const id = getTagValue(supNodes[i], 'id');
          const name = getTagValue(supNodes[i], 'name');
          if (id && name) suppliersMap.set(id, name);
        }
      } catch (e) { console.warn("Failed to parse suppliers", e); }


      // --- 1. Parse Measurements (Analysis) ---
      const measurements = [];
      const mNodes = analysisDoc.getElementsByTagName('supply-weight-measurement');

      for (let i = 0; i < mNodes.length; i++) {
        const node = mNodes[i];

        // Extended Fields Parsing
        // Extended Fields Parsing
        const rawWeight = parseFloat(getTagValue(node, 'raw-total-weight') || '0');
        const tare = parseFloat(getTagValue(node, 'tare') || '0');
        const netWeight = rawWeight - tare; // Calculated
        const supplierId = getTagValue(node, 'supplier-id');
        const fuelId = getTagValue(node, 'fuel-id'); // Extract Fuel ID

        // Prioritize Suppliers Map, then Companies Map, then ID
        const supplierName = supplierId ? (suppliersMap.get(supplierId) || companiesMap.get(supplierId) || `Fornecedor ${supplierId}`) : undefined;
        // Map Fuel Name
        const fuelName = fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined;

        const density20c = parseFloat(getTagValue(node, 'normalized-density') || '0');
        const currentDensity = parseFloat(getTagValue(node, 'current-density') || '0');
        const ticket = getTagValue(node, 'ticket-number');

        // Volume Calculations
        // Volume @ 20C = NetWeight / Density20C
        const vol20c = (netWeight > 0 && density20c > 0) ? (netWeight / density20c) : 0;

        // Volume @ Ambient (Current) - Usually 'amount' is this, but we can verify/recalc
        // Volume Current = NetWeight / CurrentDensity
        // We will use the calculated one if densities are available, otherwise fallback to 'amount'
        let volAmbient = parseFloat(getTagValue(node, 'amount') || '0');
        if (netWeight > 0 && currentDensity > 0) {
          volAmbient = netWeight / currentDensity;
        }

        measurements.push({
          id: getTagValue(node, 'id'),
          invoiceNumber: getTagValue(node, 'invoice-number'),
          date: getTagValue(node, 'weighed-at') || getTagValue(node, 'created-at'),
          density: parseFloat(getTagValue(node, 'current-density') || '0'), // Current Density for global display
          temperature: parseFloat(getTagValue(node, 'current-temperature') || '0'),
          volume: volAmbient, // Use calculated ambient volume
          weight: rawWeight,
          xmlDifference: getTagValue(node, 'difference'),
          // New Fields
          supplier_name: supplierName,
          fuel_name: fuelName, // Added Fuel Name
          gross_weight: rawWeight,
          tare: tare,
          net_weight: netWeight,
          ticket_number: ticket,
          density_20c: density20c,
          volume_20c: vol20c
        });
      }

      // Inline Helper
      function getTagValue(parent: Element, tag: string): string | null {
        const elements = parent.getElementsByTagName(tag);
        if (elements && elements.length > 0) {
          return elements[0].textContent;
        }
        return null;
      }

      // Index by Invoice Number for O(1) lookup
      const analysisMap = new Map();
      measurements.forEach(m => {
        if (m.invoiceNumber) analysisMap.set(m.invoiceNumber.trim(), m);
      });

      // --- 2. Parse Supplies (Invoices) ---
      const sNodes = suppliesDoc.getElementsByTagName('supply');

      const auditResults = [];

      let totalVolume = 0;
      let totalDiff = 0;
      let linkedCount = 0;

      for (let i = 0; i < sNodes.length; i++) {
        const node = sNodes[i];
        const invoiceNum = getTagValue(node, 'invoice-number')?.trim();
        // Fallbacks for Volume, Date, Unit
        const volume = parseFloat(getTagValue(node, 'volume') || getTagValue(node, 'amount') || '0');
        const dateStr = getTagValue(node, 'issued-at') || getTagValue(node, 'date') || getTagValue(node, 'created-at');

        // Resolve Unit Name: STRICTLY Internal Mapping (Monitored Stations Only)
        // User Request: "Auditoria trazer apenas as entradas dos postos monitorados"

        const reservoirId = getTagValue(node, 'reservoir-id') || getTagValue(node, 'destination-id');

        // If not mapped internally, SKIP entirely
        if (!reservoirId || !internalStationMap.has(reservoirId)) {
          continue;
        }

        const internalData = internalStationMap.get(reservoirId)!;
        const stationName = internalData.station;
        const farmName = internalData.farm;
        const unitName = `${farmName} - ${stationName}`;

        // Extract Fuel from Supply node if possible
        const fuelId = getTagValue(node, 'fuel-id');
        let fuelName = fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined;

        if (!invoiceNum) continue;

        const match = analysisMap.get(invoiceNum);
        if (match) {
          linkedCount++;
          // If match has fuel_name (from analysis), prefer that or ensure consistency
          if (match.fuel_name) fuelName = match.fuel_name;
        }

        let diff = 0;
        let diffPercent = 0;
        let conformity = 'unknown';
        let status = 'MISSING_ANALYSIS';

        if (match) {
          status = 'ANALYZED';
          // Calculate physical volume from the analysis data
          // PRIORITIZE Volume @ 20C (ANP Standard) if available, otherwise Ambient
          const physicalVolume = (match.volume_20c && match.volume_20c > 0) ? match.volume_20c : match.volume;

          // Recalculate diff relative to THIS supply invoice volume
          // (Physical - Invoice)
          diff = physicalVolume - volume;
          diffPercent = volume > 0 ? (Math.abs(diff) / volume) * 100 : 0;

          // Conformity Checks
          // Tolerance: 0.5% (example)
          conformity = diffPercent > 0.5 ? 'non_conforming' : 'conforming';
          // Check Density 20C (Nornalized) for Quality compliance (0.8 ~ 0.9)
          const d20 = match.density_20c;
          if (d20 < 0.8 || d20 > 0.9) conformity = 'non_conforming';
        }

        totalVolume += volume;
        if (match) totalDiff += diff;

        auditResults.push({
          id: getTagValue(node, 'id'),
          invoiceNumber: invoiceNum,
          date: dateStr,
          volume: volume,
          unit_id: unitName,
          station_name: stationName,
          farm_name: farmName,
          fuel_name: fuelName, // Added Fuel Name
          status: status,
          conformity: conformity,
          difference: diff,
          differencePercent: diffPercent,
          analysis: match
        });
      }

      return {
        stats: {
          totalVolume,
          totalDifference: totalDiff,
          analysisCoverage: auditResults.length > 0 ? (linkedCount / auditResults.length) * 100 : 0,
          totalAnalyzed: linkedCount,
          totalCount: auditResults.length
        },
        data: auditResults.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
      };

    } catch (error) {
      console.error("Erro na Auditoria (Client-Side):", error);
      throw error;
    }
  },

  /**
   * Helper to map Reservoir IDs to Station Names
   */
  async getReservoirLocationMap(headers: Headers, config: any): Promise<Map<string, string>> {
    try {
      console.log("DEBUG: Fetching Station Map for Location...");
      const response = await fetch(`${config.BASE_URL}/stations.xml`, { headers });
      if (!response.ok) {
        console.warn("DEBUG: Failed to fetch stations.xml", response.status);
        return new Map();
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const map = new Map<string, string>();
      const stations = doc.getElementsByTagName('station');

      for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        const stationName = getTagValue(station, 'name') || `Estação ${getTagValue(station, 'id')}`;

        const reservoirs = station.getElementsByTagName('reservoir');
        for (let j = 0; j < reservoirs.length; j++) {
          const resId = getTagValue(reservoirs[j], 'id');
          if (resId) {
            map.set(resId, stationName);
          }
        }
      }
      console.log("DEBUG: Station Map Loaded. Size:", map.size);
      return map;

    } catch (e) {
      console.warn("Failed to load stations for location mapping", e);
      return new Map();
    }
  },


  /**
    * Fetches stock measurements from Nuntec API.
    * Returns the raw list of measurements from the last 72h (or configured window).
    */
  async getStockMeasurements(): Promise<NuntecMeasurement[]> {
    const config = await this.getConfig();

    if (!config) return [];

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      // Fetch data from the last 72 hours to ensure we cover weekends/holidays
      // Ensure we use a safe fallback if subHours fails or returns invalid
      const now = new Date();
      const sinceDate = subHours(now, 72);
      const since = format(sinceDate, "yyyy-MM-dd'T'HH:mm:ss");

      const response = await fetch(
        `${config.BASE_URL}/stock_pointings.xml?created_at=${since}`,
        {
          method: 'GET',
          headers: headers,
        },
      );

      if (!response.ok) {
        console.warn('Nuntec API (Stock) request failed.');
        return [];
      }

      const xmlText = await response.text();
      if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        throw new Error('API returned HTML (Login Redirect)');
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const nodes = xmlDoc.getElementsByTagName('stock-pointing');

      const measurements: NuntecMeasurement[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const m = {
          id: getTagValue(node, 'id'),
          'operator-id': getTagValue(node, 'operator-id'),
          'reservoir-id': getTagValue(node, 'reservoir-id'),
          amount: parseFloat(getTagValue(node, 'amount') || '0'),
          'measured-at': getTagValue(node, 'measured-at'),
        } as NuntecMeasurement;

        if (m.id && m['reservoir-id']) {
          measurements.push(m);
        }
      }

      return measurements;
    } catch (error) {
      console.error('Error fetching Nuntec Stock:', error);
      return [];
    }
  },

  /**
   * Fetches station structure (Capacity/Stock) from Nuntec API.
   * Useful for progress bars and capacity management.
   */
  async getStationsData(): Promise<NuntecReservoir[]> {
    const config = await this.getConfig();
    if (!config) return [];

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      const response = await fetch(`${config.BASE_URL}/stations.xml`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        console.warn('Nuntec API (Stations) request failed.');
        return [];
      }

      const xmlText = await response.text();
      if (xmlText.includes('<html')) throw new Error('API returned HTML');

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const reservoirNodes = xmlDoc.getElementsByTagName('reservoir');

      const reservoirs: NuntecReservoir[] = [];

      for (let i = 0; i < reservoirNodes.length; i++) {
        const node = reservoirNodes[i];
        const id = getTagValue(node, 'id');
        const stationId = getTagValue(node, 'station-id');

        if (id && stationId) {
          // Parse nozzles to get their IDs
          const nozzleNodes = node.getElementsByTagName('nozzle');
          const nozzleIds: string[] = [];
          for (let j = 0; j < nozzleNodes.length; j++) {
            const nId = getTagValue(nozzleNodes[j], 'id');
            if (nId) nozzleIds.push(nId);
          }

          reservoirs.push({
            id: id,
            name: getTagValue(node, 'name') || `Tanque ${id}`,
            'fuel-id': getTagValue(node, 'fuel-id') || '0',
            capacity: parseFloat(getTagValue(node, 'capacity') || '0'),
            stock: parseFloat(getTagValue(node, 'stock') || '0'),
            'station-id': stationId,
            nozzleIds: nozzleIds
          });
        }
      }

      return reservoirs;
    } catch (error) {
      console.error('Error fetching Nuntec Stations:', error);
      return [];
    }
  },

  /**
   * Fetches admeasurements (pump calibrations) from Nuntec API.
   * Used to track pump health and calibration status.
   */
  async getAdmeasurements(): Promise<NuntecAdmeasurement[]> {
    const config = await this.getConfig();
    if (!config) return [];

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      const response = await fetch(`${config.BASE_URL}/admeasurements.xml`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        console.warn('Nuntec API (Admeasurements) request failed.');
        return [];
      }

      const xmlText = await response.text();
      if (xmlText.includes('<html')) throw new Error('API returned HTML');

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const nodes = xmlDoc.getElementsByTagName('admeasurement');

      const records: NuntecAdmeasurement[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const id = getTagValue(node, 'id');
        const nozzleId = getTagValue(node, 'nozzle-id');

        if (id && nozzleId) {
          records.push({
            id: id,
            'operator-id': getTagValue(node, 'operator-id') || '0',
            'nozzle-id': nozzleId,
            'pulse-factor': parseFloat(getTagValue(node, 'pulse-factor') || '0'),
            'updated-at': getTagValue(node, 'updated-at') || '',
          });
        }
      }

      // Sort by date desc (newest first)
      return records.sort((a, b) =>
        new Date(b['updated-at']).getTime() - new Date(a['updated-at']).getTime()
      );

    } catch (error) {
      console.error('Error fetching Nuntec Admeasurements:', error);
      return [];
    }
  },

  /**
   * Fetches transfers (consumption) from Nuntec API for the last X days.
   * Used for functionality like "Autonomy Calculation".
   */
  /**
   * Fetches consumptions (fuelings) from Nuntec API for the last X days.
   * Uses /fuelings.xml endpoint.
   */
  async getConsumptions(days = 7): Promise<NuntecConsumption[]> {
    const config = await this.getConfig();
    if (!config) return [];

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      const now = new Date();
      const sinceDate = subHours(now, days * 24);
      const since = format(sinceDate, "yyyy-MM-dd'T'HH:mm:ss");

      // 1. Fetch Fuelings (Abastecimentos)
      const fetchFuelings = fetch(`${config.BASE_URL}/fuelings.xml?updated_at=${since}`, {
        method: 'GET', headers: headers
      });

      // 2. Fetch Transfers (Transferências/Aferições/Drenas)
      const fetchTransfers = fetch(`${config.BASE_URL}/transfers.xml?updated_at=${since}`, {
        method: 'GET', headers: headers
      });

      const [resFuelings, resTransfers] = await Promise.all([fetchFuelings, fetchTransfers]);
      const consumptions: NuntecConsumption[] = [];

      // --- Process Fuelings ---
      if (resFuelings.ok) {
        const xmlText = await resFuelings.text();
        if (!xmlText.includes('<html')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const nodes = xmlDoc.getElementsByTagName('fueling');

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pointingNode = node.getElementsByTagName('pointing')[0];
            if (!pointingNode) continue;

            const rawAmount = parseFloat(getTagValue(pointingNode, 'amount') || '0');
            const amount = Math.abs(rawAmount);

            const endDate = getTagValue(node, 'end-at') || getTagValue(pointingNode, 'datetime');

            // Date Filter
            if (endDate && parseISO(endDate) < sinceDate) continue;

            const t: NuntecConsumption = {
              id: getTagValue(node, 'id') || '',
              amount: amount,
              'end-date': endDate || '',
              'reservoir-id': getTagValue(pointingNode, 'reservoir-id') || '',
              'nozzle-id': getTagValue(pointingNode, 'nozzle-number') || undefined,
            };

            if (t.id && t['reservoir-id']) consumptions.push(t);
          }
        }
      }

      // --- Process Transfers ---
      if (resTransfers.ok) {
        const xmlText = await resTransfers.text();
        if (!xmlText.includes('<html')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const nodes = xmlDoc.getElementsByTagName('transfer');

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pointingOutTags = node.getElementsByTagName('pointing-out');
            let pointingOut = null;
            for (let j = 0; j < pointingOutTags.length; j++) {
              if (pointingOutTags[j].children.length > 0) {
                pointingOut = pointingOutTags[j];
                break;
              }
            }
            if (!pointingOut) continue;

            const rawAmountStr = getTagValue(pointingOut, 'amount') || getTagValue(node, 'amount');
            const amount = Math.abs(parseFloat(rawAmountStr || '0'));

            const endDate = getTagValue(node, 'end-at') || getTagValue(node, 'end-date');

            // Date Filter
            if (endDate && parseISO(endDate) < sinceDate) continue;

            // Identification
            const reservoirId = getTagValue(pointingOut, 'reservoir-id') || getTagValue(node, 'origin-reservoir-id');
            const nozzleId = getTagValue(pointingOut, 'nozzle-number') || getTagValue(node, 'nozzle-id');

            const t: NuntecConsumption = {
              id: getTagValue(node, 'id') || '',
              amount: amount,
              'end-date': endDate || '',
              'reservoir-id': reservoirId || '',
              'nozzle-id': nozzleId || undefined,
            };

            if (t.id && (t['reservoir-id'] || t['nozzle-id'])) {
              consumptions.push(t);
            }
          }
        }
      }

      return consumptions;

    } catch (error) {
      console.error('Error fetching Nuntec Consumptions:', error);
      return [];
    }
  },

  /**
   * Helper to get active config or defaults
   */
  async getConfig() {
    try {
      const config = await db.getIntegrationConfig();
      if (config) {
        if (!config.is_active) return null; // Explicitly disabled
        return {
          BASE_URL: config.base_url || DEFAULTS.BASE_URL,
          START_DATE_SYNC: config.sync_start_date
            ? `${config.sync_start_date}T00:00:00`
            : DEFAULTS.START_DATE_SYNC,
          AUTH_USER: config.username || DEFAULTS.AUTH_USER,
          AUTH_PASS: config.password || DEFAULTS.AUTH_PASS,
        };
      }
    } catch (e) {
      console.warn('Failed to load integration config, using defaults', e);
    }
    // Fallback to legacy defaults if no config found in DB
    return DEFAULTS;
  },

  /**
   * Fetches all vehicles from Nuntec API.
   * Used to sync fleet data (IDs and Names).
   */
  async getVehicles(): Promise<Veiculo[]> {
    const config = await this.getConfig();
    if (!config) return [];

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      const response = await fetch(`${config.BASE_URL}/vehicles.xml`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        console.warn('Nuntec API (Vehicles) request failed.');
        return [];
      }

      const xmlText = await response.text();
      // Check for HTML response
      if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        throw new Error('API returned HTML (Login Redirect)');
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      // User snippet shows <vehicle-module>, but standard API is <vehicle> list.
      // We will look for both to be robust.
      let nodes = xmlDoc.getElementsByTagName('vehicle');
      if (nodes.length === 0) {
        nodes = xmlDoc.getElementsByTagName('vehicle-module');
      }

      const vehicles: Veiculo[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // ID Extraction
        // Try direct <id> or <vehicle-id>
        const id = getTagValue(node, 'id') || getTagValue(node, 'vehicle-id');

        // Name Extraction
        // Try <name>, <identification>, or fallback
        const name = getTagValue(node, 'name') || getTagValue(node, 'identification') || `Veículo ${id}`;

        // Active Status
        // Default to true if missing
        const activeText = getTagValue(node, 'active') || getTagValue(node, 'status');
        const active = activeText !== 'false' && activeText !== 'inactive' && activeText !== '0';

        if (id) {
          vehicles.push({
            id,
            identificacao: name.trim(),
            ativo: active
          });
        }
      }

      return vehicles;
    } catch (error) {
      console.error('Error fetching Nuntec Vehicles:', error);
      return [];
    }
  },

  /**
   * Fetches transfers from Nuntec API and filters them based on monitored stations and existing data.
   */
  async getPendingTransfers(
    postos: Posto[],
    existingAbastecimentos: Abastecimento[],
  ): Promise<NuntecTransfer[]> {
    const config = await this.getConfig();

    if (!config) {
      console.warn('Nuntec integration is disabled in settings.');
      return []; // Return empty if disabled
    }

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      // 1. Fetch from API
      const response = await fetch(
        `${config.BASE_URL}/transfers.xml?updated_after=${config.START_DATE_SYNC}`,
        {
          method: 'GET',
          headers: headers,
        },
      );

      if (!response.ok) {
        console.warn(
          'Nuntec API request failed or not configured. Using Mock Data for demonstration.',
        );
        return mockTransfers(postos, existingAbastecimentos);
      }

      const xmlText = await response.text();

      // Check if response is HTML
      if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        console.error(
          'Nuntec API returned HTML. Likely authentication failed or redirected to login.',
        );
        throw new Error('API returned HTML (Login Redirect)');
      }

      // 2. Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const transferNodes = xmlDoc.getElementsByTagName('transfer');

      const allTransfers: NuntecTransfer[] = [];

      for (let i = 0; i < transferNodes.length; i++) {
        const node = transferNodes[i];
        const transfer = parseTransferNode(node);
        if (transfer) {
          allTransfers.push(transfer);
        }
      }

      // 3. Filter Logic
      const monitoredReservoirIds = new Set(
        postos
          .filter((p) => p.ativo && p.nuntec_reservoir_id)
          .map((p) => String(p.nuntec_reservoir_id)),
      );

      const existingTransferIds = new Set(
        existingAbastecimentos
          .filter((a) => a.nuntec_transfer_id)
          .map((a) => String(a.nuntec_transfer_id)),
      );

      const filteredTransfers: NuntecTransfer[] = [];

      for (const t of allTransfers) {
        const destId = t['pointing-in']?.['reservoir-id'];
        const isMonitored = destId && monitoredReservoirIds.has(String(destId));
        const isAlreadyImported = existingTransferIds.has(String(t.id));

        if (isMonitored && !isAlreadyImported) {
          if (t['operator-id']) {
            t.operatorName = await this.getOperatorName(t['operator-id'], headers, config);
          }
          t.status = 'PENDENTE_DADOS';
          filteredTransfers.push(t);
        }
      }

      return filteredTransfers;
    } catch (error: any) {
      console.error('Error fetching Nuntec transfers:', error);
      throw new Error(error.message || 'Falha na conexão com a Nuntec.');
    }
  },

  /**
   * Fetches operator name by ID
   */
  async getOperatorName(id: string, headers?: Headers, config?: any): Promise<string> {
    if (operatorCache.has(id)) {
      return operatorCache.get(id)!;
    }

    const myConfig = config || (await this.getConfig());
    if (!myConfig) return `Operador ${id}`;

    const myHeaders = headers || new Headers();
    if (!myHeaders.has('Authorization')) {
      myHeaders.set(
        'Authorization',
        'Basic ' + btoa(`${myConfig.AUTH_USER}:${myConfig.AUTH_PASS}`),
      );
    }

    try {
      const response = await fetch(`${myConfig.BASE_URL}/operators/${id}.xml`, {
        headers: myHeaders,
      });
      if (!response.ok) return `Operador ${id}`;

      const xmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const nameNode = doc.querySelector('operator > name');
      const rawName = nameNode?.textContent || `Operador ${id}`;

      const formatName = (name: string): string => {
        if (!name) return name;
        return name
          .toLowerCase()
          .split(' ')
          .map((word, index) => {
            if (index > 0 && ['de', 'da', 'do', 'dos', 'das', 'e'].includes(word)) {
              return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(' ');
      };

      const name = formatName(rawName);
      operatorCache.set(id, name);
      return name;
    } catch (e) {
      console.warn(`Failed to fetch operator ${id}`, e);
      return `Operador ${id}`;
    }
  },

  /**
   * Test connection with provided config
   */
  async testConnection(testConfig: any): Promise<boolean> {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${testConfig.username}:${testConfig.password}`));

    const url = `${testConfig.base_url || DEFAULTS.BASE_URL}/transfers.xml?updated_after=${testConfig.sync_start_date || DEFAULTS.START_DATE_SYNC
      }&_t=${Date.now()}`;

    const response = await fetch(url, { method: 'GET', headers: headers });

    if (response.ok) {
      const text = await response.text();
      console.log(
        '[DEBUG NUNTEC] Status:',
        response.status,
        'Response Preview:',
        text.substring(0, 300),
      );

      if (text.includes('<html') || text.includes('<!DOCTYPE html>') || text.includes('<body')) {
        throw new Error('Acesso Negado (Credenciais inválidas ou sessão expirada na Nuntec).');
      }

      if (!text.startsWith('<?xml') && !text.includes('<transfers')) {
        if (text.trim().length === 0) throw new Error('A API retornou uma resposta vazia.');
        if (!text.includes('<')) throw new Error('A resposta não parece ser um XML válido.');
      }

      return true;
    } else {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Usuário ou Senha incorretos (Erro 401/403).');
      }
      throw new Error(`Erro API: ${response.status} ${response.statusText}`);
    }
  },
  /**
   * Retrieves a specific transfer by ID to get technical details (operator-id, fuel-id, etc.)
   */
  async getTransferById(transferId: string): Promise<NuntecTransfer | null> {
    const config = await this.getConfig();
    if (!config) return null;

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));

    try {
      // Fetch transfers from the sync start date to ensure we cover the transfer range
      const response = await fetch(
        `${config.BASE_URL}/transfers.xml?updated_after=${config.START_DATE_SYNC}`,
        {
          method: 'GET',
          headers: headers,
        },
      );

      if (!response.ok) return null;

      const xmlText = await response.text();
      if (xmlText.includes('<html')) return null;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const transferNodes = xmlDoc.getElementsByTagName('transfer');

      for (let i = 0; i < transferNodes.length; i++) {
        const node = transferNodes[i];
        // Parse basic details first to check ID
        const idNode = Array.from(node.children).find(c => c.tagName === 'id');
        if (idNode?.textContent === transferId) {
          return parseTransferNode(node);
        }
      }

      return null;
    } catch (e) {
      console.error("Error fetching transfer by ID", e);
      return null;
    }
  },

  /**
   * Tries to repair missing technical IDs (fuel-id, etc) by re-fetching the original transfer
   */
  async repairFuelingData(fuelingId: string, nuntecTransferId: string): Promise<boolean> {
    try {
      console.log(`Reparando dados para abastecimento ${fuelingId} com Transferencia Nuntec ${nuntecTransferId}`);

      const transfer = await this.getTransferById(nuntecTransferId);
      if (!transfer) {
        throw new Error(`Transferência Nuntec ${nuntecTransferId} não encontrada na API.`);
      }

      const updates: any = {};

      // Check for data that is possibly missing locally but present in Nuntec
      if (transfer['pointing-in']?.['fuel-id']) updates.nuntec_fuel_id = transfer['pointing-in']['fuel-id'];
      if (transfer['pointing-in']?.['reservoir-id']) updates.nuntec_reservoir_id = transfer['pointing-in']['reservoir-id'];
      if (transfer['pointing-in']?.['nozzle-number']) updates.nuntec_nozzle_number = transfer['pointing-in']['nozzle-number'];
      if (transfer['operator-id']) updates.nuntec_operator_id = transfer['operator-id'];

      if (Object.keys(updates).length === 0) {
        console.warn("Nenhum dado novo encontrado na Nuntec para atualizar.");
        return false;
      }

      const { error } = await supabase
        .from('abastecimentos')
        .update(updates)
        .eq('id', fuelingId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Erro ao reparar dados Nuntec:", error);
      throw error;
    }
  },

  /**
   * Scans for all fueling records with Nuntec Transfer ID but missing Fuel ID,
   * and attempts to repair them sequentially.
   */
  async repairAllMissingData(): Promise<{ total: number; fixed: number; errors: number }> {
    try {
      // 1. Find candidates
      const { data: candidates, error } = await supabase
        .from('abastecimentos')
        .select('id, nuntec_transfer_id')
        .not('nuntec_transfer_id', 'is', null)
        .is('nuntec_fuel_id', null);

      if (error) throw error;
      if (!candidates || candidates.length === 0) return { total: 0, fixed: 0, errors: 0 };

      console.log(`Encontrados ${candidates.length} registros para reparo.`);

      let fixedCount = 0;
      let errorCount = 0;

      // 2. Process sequentially to avoid rate limits
      for (const item of candidates) {
        if (!item.nuntec_transfer_id) continue;
        try {
          const success = await this.repairFuelingData(item.id, item.nuntec_transfer_id);
          if (success) fixedCount++;
        } catch (e) {
          console.error(`Falha ao reparar item ${item.id}`, e);
          errorCount++;
        }
      }

      return { total: candidates.length, fixed: fixedCount, errors: errorCount };
    } catch (err) {
      console.error("Erro no reparo em massa:", err);
      throw err;
    }
  },

  /**
   * Sends the fueling command to Nuntec API
   * Returns the Nuntec ID of the created record.
   */
  async createFueling(data: Abastecimento, originalTransfer?: NuntecTransfer): Promise<string> {
    const config = await this.getConfig();
    if (!config) throw new Error('Integração Nuntec não configurada.');

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));
    headers.set('Content-Type', 'application/xml');

    // 1. Prepare Data
    // Extract Numeric IDs from Strings
    const operationId = data.operacao.match(/^(\d+)/)?.[1] || '1'; // Default to 1 if not found
    const cultureId = data.cultura.match(/^(\d+)/)?.[1] || '1';

    // Auto-Lookup Original Transfer if missing
    let sourceTransfer = originalTransfer;
    if (!sourceTransfer && data.nuntec_transfer_id) {
      sourceTransfer = (await this.getTransferById(data.nuntec_transfer_id)) || undefined;
    }

    // Technical IDs from Original Transfer or Persisted Data
    // We prioritize locally saved ID (most robust), then originalTransfer, then default
    let operatorId = data.nuntec_operator_id || sourceTransfer?.['operator-id'] || '24';
    let fuelId = data.nuntec_fuel_id || sourceTransfer?.['pointing-in']['fuel-id'] || '1';
    let reservoirId = data.nuntec_reservoir_id || sourceTransfer?.['pointing-in']['reservoir-id'];
    let nozzleNumber = data.nuntec_nozzle_number || sourceTransfer?.['pointing-in']['nozzle-number'] || '1';

    // If reservoirId is missing (Manual Release), fetch from Posto configuration
    if (!reservoirId && data.posto_id) {
      try {
        const { data: postoData } = await supabase
          .from('postos')
          .select('nuntec_reservoir_id')
          .eq('id', data.posto_id)
          .single();

        if (postoData && postoData.nuntec_reservoir_id) {
          reservoirId = String(postoData.nuntec_reservoir_id);
        }
      } catch (e) {
        console.warn('Failed to fetch Nuntec Reservoir ID from Posto', e);
      }
    }

    // Final fallback
    if (!reservoirId) reservoirId = '1';

    // Amount must be negative for output (fueled)
    const amount = -Math.abs(data.volume);

    // Vehicle ID: Must be numeric for Nuntec.
    // 1. Try existing numeric ID (if user manually entered a number or system has numeric id)
    let vehicleId = /^\d+$/.test(data.veiculo_id || '') ? data.veiculo_id : null;

    // 2. If not found, try to extract from Name (e.g. "418 - Trator" -> 418)
    if (!vehicleId && data.veiculo_nome) {
      // Try to match "ID: 123" or just "123 - ..."
      const match = data.veiculo_nome.match(/^(\d+)/);
      if (match) {
        vehicleId = match[1];
        console.log(`[Nuntec] Extracted Vehicle ID from Name: ${vehicleId}`);
      }
    }

    // 3. Fallback to '0' (Unknown) if everything fails
    if (!vehicleId) {
      console.warn(`[Nuntec] No numeric Vehicle ID found (Orig: ${data.veiculo_id}, Name: ${data.veiculo_nome}). Fallback to 0.`);
      vehicleId = '0';
    }

    // Operator ID: Must be numeric.
    // If not numeric, fall back to default '24'.
    if (!/^\d+$/.test(operatorId)) {
      console.warn(`[Nuntec] Sanitizing non-numeric Operator ID: ${operatorId} -> 24`);
      operatorId = '24';
    }

    // 2. Build XML for Fueling
    const xml = `
      <fueling>
        <vehicle-id>${vehicleId}</vehicle-id>
        <operator-id>${operatorId}</operator-id>
        <start-at>${format(parseISO(data.data_abastecimento), 'yyyy-MM-dd HH:mm:ss')}</start-at>
        <end-at>${format(parseISO(data.data_abastecimento), 'yyyy-MM-dd HH:mm:ss')}</end-at>
        <operation-id>${operationId}</operation-id>
        <culture-id>${cultureId}</culture-id>
        <pointing-attributes>
          <nozzle-number>${nozzleNumber}</nozzle-number>
          <fuel-id>${fuelId}</fuel-id>
          <amount>${amount}</amount>
          <reservoir-id>${reservoirId}</reservoir-id>
          <datetime>${format(parseISO(data.data_abastecimento), 'yyyy-MM-dd HH:mm:ss')}</datetime>
        </pointing-attributes>
      </fueling>
    `.trim();

    // 3. Send POST Fueling
    console.log('[Nuntec API] Sending Fueling XML:', xml);
    const response = await fetch(`${config.BASE_URL}/fuelings.xml`, {
      method: 'POST',
      headers,
      body: xml
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Nuntec API Error]', errorText);
      throw new Error(`Erro Nuntec (${response.status}): ${errorText}`);
    }

    // Parse response to find ID
    const responseText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseText, 'text/xml');
    const createdId = doc.querySelector('fueling > id')?.textContent;

    // 4. Send Odometery/Hourmeter (Parallel)
    if (data.tipo_marcador !== 'SEM_MEDIDOR' && data.leitura_marcador) {
      const type = data.tipo_marcador === 'ODOMETRO' ? 'odometers' : 'hourmeters';
      const tag = data.tipo_marcador === 'ODOMETRO' ? 'odometer' : 'hourmeter';

      const metricXml = `
            <${tag}>
                <vehicle-id>${vehicleId}</vehicle-id>
                <datetime>${format(parseISO(data.data_abastecimento), 'yyyy-MM-dd HH:mm:ss')}</datetime>
                <value>${data.leitura_marcador}.0</value>
                <entered-manually>true</entered-manually>
            </${tag}>
        `.trim();

      console.log(`[Nuntec API] Sending ${tag} XML:`, metricXml);
      await fetch(`${config.BASE_URL}/${type}.xml`, {
        method: 'POST',
        headers,
        body: metricXml
      }).catch(e => console.warn(`Failed to send ${tag}`, e));
    }

    // Return the ID for confirmation
    return createdId || 'Criado (ID não retornado)';
  },
};


// --- Helpers ---

function mockTransfers(postos: Posto[], existing: Abastecimento[]): NuntecTransfer[] {
  const mocks: NuntecTransfer[] = [];
  const monitored = postos.filter((p) => p.ativo && p.nuntec_reservoir_id);
  const existingIds = new Set(existing.map((a) => a.nuntec_transfer_id));

  monitored.forEach((posto, index) => {
    const mockTransferId = `mock-transfer-res-${posto.nuntec_reservoir_id}-v1`;

    if (!existingIds.has(mockTransferId)) {
      mocks.push({
        id: mockTransferId,
        'start-at': new Date(Date.now() - index * 3600000).toISOString(),
        'operator-id': '901',
        operatorName: 'Operador Teste (Mock)',
        'pointing-in': {
          id: `pi-${mockTransferId}`,
          amount: 150 + index * 25.5,
          'reservoir-id': posto.nuntec_reservoir_id,
        },
        'pointing-out': undefined,
        status: 'PENDENTE_DADOS',
      });
    }
  });

  return mocks;
}

function parseTransferNode(node: Element): NuntecTransfer | null {
  try {
    let id: string | null = null;
    let startAt: string | null = null;
    let endAt: string | null = null;
    let operatorId: string | null = null;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.tagName === 'id') id = child.textContent;
      if (child.tagName === 'start-at') startAt = child.textContent;
      if (child.tagName === 'end-at') endAt = child.textContent;
      if (child.tagName === 'operator-id') operatorId = child.textContent;
    }

    if (!id || !startAt) return null;

    let pointingInNode: Element | undefined;
    let pointingOutNode: Element | undefined;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.tagName === 'pointing-in') {
        if (child.children.length > 0) pointingInNode = child;
      }
      if (child.tagName === 'pointing-out') {
        if (child.children.length > 0) pointingOutNode = child;
      }
    }

    const extract = (parent: Element | undefined, tag: string) => {
      if (!parent) return undefined;
      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i].tagName === tag) return parent.children[i].textContent;
      }
      return undefined;
    };

    const pointingIn: NuntecPointing = {
      id: extract(pointingInNode, 'id') || '',
      amount: parseFloat(extract(pointingInNode, 'amount') || '0'),
      'reservoir-id': extract(pointingInNode, 'reservoir-id'),
      'fuel-id': extract(pointingInNode, 'fuel-id'),
    };

    const pointingOut = pointingOutNode
      ? {
        id: extract(pointingOutNode, 'id') || '',
        amount: parseFloat(extract(pointingOutNode, 'amount') || '0'),
        'reservoir-id': extract(pointingOutNode, 'reservoir-id'),
      }
      : undefined;

    return {
      id,
      'start-at': startAt,
      'end-at': endAt || undefined,
      'operator-id': operatorId || undefined,
      'pointing-in': pointingIn,
      'pointing-out': pointingOut,
    };
  } catch (e) {
    console.warn('Error parsing transfer node', e);
    return null;
  }
}

function getTagValue(parent: Element, tag: string): string | null {
  // Try to find the tag as a descendant
  const elements = parent.getElementsByTagName(tag);
  if (elements && elements.length > 0) {
    return elements[0].textContent;
  }

  // Strict child check fallback (rarely needed if getElementsByTagName works, but kept for safety/logic match)
  // Actually, getElementsByTagName is sufficient for 'first occurrence'.

  return null;
}
