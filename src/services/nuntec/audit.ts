
import { format, subHours } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { NuntecAuditMeasurement } from './types';
import { getConfig, getAuthHeaders, fetchNuntec } from './api';
import { getTagValue, parseXML } from './parsers';

export async function getAuditDataService(): Promise<{ stats: any; data: any[] }> {
    const config = await getConfig();
    if (!config) return { stats: {}, data: [] };

    const headers = getAuthHeaders(config);

    try {
        const now = new Date();
        const sinceDate = subHours(now, 30 * 24); // 30 days
        const since = format(sinceDate, "yyyy-MM-dd'T'HH:mm:ss");

        const [analysisRes, suppliesRes] = await Promise.all([
            fetchNuntec(`supply_weight_measurements.xml?created_at=${since}`, config, headers),
            fetchNuntec(`supplies.xml?created_at=${since}`, config, headers)
        ]);

        // Auxiliary fetches (Soft Fail)
        const fetchAux = async (endpoint: string) => {
            try {
                const res = await fetchNuntec(endpoint, config, headers);
                return await res.text();
            } catch (e) {
                console.warn(`Optional fetch failed: ${endpoint}`, e);
                return ''; // Return empty XML string on failure
            }
        };

        const [companiesText, internalStationsRes, fuelsText, suppliersText] = await Promise.all([
            fetchAux('companies.xml'),
            supabase.from('postos').select('id, nome, nuntec_reservoir_id, fazenda:fazendas(nome)').not('nuntec_reservoir_id', 'is', null),
            fetchAux('fuels.xml'),
            fetchAux('suppliers.xml')
        ]);

        if (!analysisRes.ok || !suppliesRes.ok) {
            console.warn("Audit Debug: Failed to fetch Nuntec data.");
            return { stats: {}, data: [] };
        }

        const analysisText = await analysisRes.text();
        const suppliesText = await suppliesRes.text();
        const analysisDoc = parseXML(analysisText);
        const suppliesDoc = parseXML(suppliesText);
        const companiesDoc = parseXML(companiesText);
        const fuelsDoc = parseXML(fuelsText);
        const suppliersDoc = parseXML(suppliersText);

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

        // Helper: Parse Companies Map
        const companiesMap = new Map<string, string>();
        const compNodes = companiesDoc.getElementsByTagName('company');
        for (let i = 0; i < compNodes.length; i++) {
            const id = getTagValue(compNodes[i], 'id');
            const name = getTagValue(compNodes[i], 'name');
            if (id && name) companiesMap.set(id, name);
        }

        // Helper: Parse Fuels Map
        const fuelsMap = new Map<string, string>();
        fuelsMap.set('2', 'Óleo Diesel');
        fuelsMap.set('4', 'Gasolina Comum');
        fuelsMap.set('5', 'Querosene');
        fuelsMap.set('6', 'AVGAS');

        const fuelNodes = fuelsDoc.getElementsByTagName('fuel');
        for (let i = 0; i < fuelNodes.length; i++) {
            const id = getTagValue(fuelNodes[i], 'id');
            const name = getTagValue(fuelNodes[i], 'name');
            if (id && name) fuelsMap.set(id, name);
        }

        // Helper: Parse Suppliers Map
        const suppliersMap = new Map<string, string>();
        const supNodes = suppliersDoc.getElementsByTagName('supplier');
        for (let i = 0; i < supNodes.length; i++) {
            const id = getTagValue(supNodes[i], 'id');
            const name = getTagValue(supNodes[i], 'name');
            if (id && name) suppliersMap.set(id, name);
        }

        // --- 1. Parse Measurements (Analysis) ---
        const measurements: NuntecAuditMeasurement[] = [];
        const mNodes = analysisDoc.getElementsByTagName('supply-weight-measurement');

        for (let i = 0; i < mNodes.length; i++) {
            const node = mNodes[i];
            const rawWeight = parseFloat(getTagValue(node, 'raw-total-weight') || '0');
            const tare = parseFloat(getTagValue(node, 'tare') || '0');
            const netWeight = rawWeight - tare;
            const supplierId = getTagValue(node, 'supplier-id');
            const fuelId = getTagValue(node, 'fuel-id');

            const supplierName = supplierId ? (suppliersMap.get(supplierId) || companiesMap.get(supplierId) || `Fornecedor ${supplierId}`) : undefined;
            const fuelName = fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined;

            const density20c = parseFloat(getTagValue(node, 'normalized-density') || '0');
            const currentDensity = parseFloat(getTagValue(node, 'current-density') || '0');

            let volAmbient = parseFloat(getTagValue(node, 'amount') || '0');
            if (netWeight > 0 && currentDensity > 0) {
                volAmbient = netWeight / currentDensity;
            }

            const vol20c = (netWeight > 0 && density20c > 0) ? (netWeight / density20c) : 0;

            measurements.push({
                id: getTagValue(node, 'id') || '',
                invoiceNumber: getTagValue(node, 'invoice-number') || '',
                date: getTagValue(node, 'weighed-at') || getTagValue(node, 'created-at') || '',
                density: currentDensity,
                temperature: parseFloat(getTagValue(node, 'current-temperature') || '0'),
                volume: volAmbient,
                weight: rawWeight,
                xmlDifference: getTagValue(node, 'difference') || '',
                supplier_name: supplierName,
                fuel_name: fuelName,
                fuel_id: fuelId || undefined, // Added for strict matching
                gross_weight: rawWeight,
                tare: tare,
                net_weight: netWeight,
                ticket_number: getTagValue(node, 'ticket-number') || '',
                density_20c: density20c,
                volume_20c: vol20c
            });
        }
        // Index Analysis
        const analysisMap = new Map();
        measurements.forEach(m => {
            if (m.invoiceNumber) analysisMap.set(m.invoiceNumber.trim(), m);
        });

        // --- 2. Grouping Logic (Match Supplies to Analyses) ---
        const sNodes = suppliesDoc.getElementsByTagName('supply');

        // Structures for processing
        const auditResults: any[] = [];
        const groupedSupplies = new Map<string, any[]>(); // Analysis ID -> List of Supplies
        const consumedSupplyIds = new Set<string>(); // To track which supplies have been matched

        // First Pass: Collect all Valid Supplies (with Deduplication)
        const validSupplies: any[] = [];
        const seenSupplyIds = new Set<string>();

        for (let i = 0; i < sNodes.length; i++) {
            const node = sNodes[i];
            const id = getTagValue(node, 'id');

            if (!id || seenSupplyIds.has(id)) continue; // Skip duplicates

            const reservoirId = getTagValue(node, 'reservoir-id') || getTagValue(node, 'destination-id');

            // Only process supplies for known internal stations
            if (!reservoirId || !internalStationMap.has(reservoirId)) continue;

            seenSupplyIds.add(id);
            const internalData = internalStationMap.get(reservoirId)!;
            const invoiceNum = getTagValue(node, 'invoice-number')?.trim();

            if (!invoiceNum) continue;

            const fuelId = getTagValue(node, 'fuel-id');
            const fuelName = fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined;

            validSupplies.push({
                id: id,
                invoiceNumber: invoiceNum,
                volume: parseFloat(getTagValue(node, 'volume') || getTagValue(node, 'amount') || '0'),
                date: getTagValue(node, 'issued-at') || getTagValue(node, 'date') || getTagValue(node, 'created-at'),
                internalData,
                fuelName,
                fuel_id: fuelId || undefined, // Added for strict matching
                rawNode: node
            });
        }

        // Second Pass: Match Supplies to Analysis (STRICT Match: Tokens AND Fuel ID)
        validSupplies.forEach(supply => {
            const supplyNF = String(supply.invoiceNumber).trim();

            // Strict Match: Split measurement invoice string into tokens (e.g. "154544 - 154545" -> ["154544", "154545"])
            // And check if supplyNF equals one of the tokens exactly.
            // AND ensure Fuel ID matches (prevent grouping Kerosene with Diesel)
            const match = measurements.find(m => {
                if (!m.invoiceNumber) return false;

                // Check Fuel Match first (Fastest)
                if (supply.fuel_id && m.fuel_id && supply.fuel_id !== m.fuel_id) {
                    return false;
                }

                // Regex matches any sequence of digits
                const tokens: string[] = m.invoiceNumber.match(/\d+/g) || [];
                return tokens.includes(supplyNF);
            });

            if (match) {
                if (!groupedSupplies.has(match.id)) {
                    groupedSupplies.set(match.id, []);
                }
                groupedSupplies.get(match.id)!.push(supply);
                consumedSupplyIds.add(supply.id);
            }
        });

        // Third Pass: Build Results

        // A. Add Grouped/Matched Items
        groupedSupplies.forEach((supplies, measurementId) => {
            const measurement = measurements.find(m => m.id === measurementId)!;

            // Aggregate Supply Data
            const totalVolume = supplies.reduce((acc, s) => acc + s.volume, 0);

            // Internal Data (Farm/Station) - Assume consistent within group, take first
            const firstSupply = supplies[0];

            // Calculate Difference based on Group Total
            const physicalVolume = (measurement.volume_20c && measurement.volume_20c > 0) ? measurement.volume_20c : measurement.volume;
            const diff = physicalVolume - totalVolume;
            const diffPercent = totalVolume > 0 ? (Math.abs(diff) / totalVolume) * 100 : 0;

            let conformity = 'conforming';
            if (Math.abs(diffPercent) > 0.5) conformity = 'non_conforming';
            const d20 = measurement.density_20c;
            if (d20 && (d20 < 0.8 || d20 > 0.9)) conformity = 'non_conforming';

            auditResults.push({
                id: measurement.id, // Use Analysis ID as Row ID for grouped items
                invoiceNumber: measurement.invoiceNumber, // Used the combined string ("154544 - 154545")
                date: firstSupply.date || measurement.date, // Use Supply Date (Entry) instead of Analysis Date
                volume: totalVolume, // Sum of NFs
                unit_id: `${firstSupply.internalData.farm} - ${firstSupply.internalData.station}`,
                station_name: firstSupply.internalData.station,
                farm_name: firstSupply.internalData.farm,
                fuel_name: firstSupply.fuelName || measurement.fuel_name,
                status: 'ANALYZED',
                conformity: conformity,
                difference: diff,
                differencePercent: diffPercent,
                analysis: measurement,
                groupedSupplies: supplies.map(s => ({
                    id: s.id,
                    invoiceNumber: s.invoiceNumber,
                    volume: s.volume,
                    date: s.date
                }))
            });
        });

        // B. Add Unmatched (Missing Analysis) Supplies
        validSupplies.forEach(supply => {
            if (!consumedSupplyIds.has(supply.id)) {
                auditResults.push({
                    id: supply.id,
                    invoiceNumber: supply.invoiceNumber,
                    date: supply.date,
                    volume: supply.volume,
                    unit_id: `${supply.internalData.farm} - ${supply.internalData.station}`,
                    station_name: supply.internalData.station,
                    farm_name: supply.internalData.farm,
                    fuel_name: supply.fuelName,
                    status: 'MISSING_ANALYSIS',
                    conformity: 'unknown',
                    difference: 0,
                    differencePercent: 0,
                    analysis: undefined
                });
            }
        });

        // C. Add Unmatched Measurements (Missing Entry)
        const consumedMeasurementIds = new Set<string>();
        // Consumed by groupedSupplies
        groupedSupplies.forEach((_, mId) => consumedMeasurementIds.add(mId));

        // Also need to check if any measurements were "consumed" by matched supplies in a way I missed?
        // Actually, the consuming logic is: matched supplies -> groupedSupplies (keyed by measurement ID).
        // So `groupedSupplies.keys()` are the matched measurements.

        measurements.forEach(m => {
            if (!groupedSupplies.has(m.id)) {
                auditResults.push({
                    id: m.id,
                    invoiceNumber: m.invoiceNumber,
                    date: m.date,
                    volume: m.volume, // Volume from Analysis
                    unit_id: 'Indefinido', // No Farm/Station info since no matched supply
                    station_name: 'Indefinido',
                    farm_name: 'Indefinido',
                    fuel_name: m.fuel_name || 'Desconhecido',
                    status: 'MISSING_ENTRY',
                    conformity: 'unknown',
                    difference: 0,
                    differencePercent: 0,
                    analysis: m
                });
            }
        });

        // Calculate Stats
        const totalVolume = auditResults.reduce((acc, i) => acc + i.volume, 0);
        const totalDiff = auditResults.reduce((acc, i) => acc + i.difference, 0);
        const analyzedCount = auditResults.filter(i => i.status === 'ANALYZED').length;

        return {
            stats: {
                totalVolume,
                totalDifference: totalDiff,
                analysisCoverage: auditResults.length > 0 ? (analyzedCount / auditResults.length) * 100 : 0,
                totalAnalyzed: analyzedCount,
                totalCount: auditResults.length
            },
            data: auditResults.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            })
        };

    } catch (error) {
        console.error("Erro na Auditoria (Refactored):", error);
        return { stats: {}, data: [] };
    }
}
