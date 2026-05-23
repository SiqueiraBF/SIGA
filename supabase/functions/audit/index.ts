import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function getCors(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const isAllowed = origin.includes('localhost') || origin.endsWith('nadiana.com.br') || origin.endsWith('vercel.app');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://siga.nadiana.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
}


// --- Node.js Regex XML Helpers ---
function getTagValue(xmlSnippet: string, tagName: string): string | null {
    const match = xmlSnippet.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? match[1].trim() : null;
}

function getElements(xmlText: string, tagName: string): string[] {
    const matches = [...xmlText.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))];
    return matches.map(m => m[1]);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCors(req) });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Security check: Validate JWT from request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: getCors(req) });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: verifyError } = await supabase.auth.getUser(token);
        
        if (verifyError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers: getCors(req) });
        }

        // Fetch Nuntec Credentials Securely
        const { data: config } = await supabase
            .from('integration_settings')
            .select('*')
            .eq('provider', 'NUNTEC')
            .maybeSingle();

        if (!config || !config.is_active || !config.base_url || !config.username) {
            return new Response(JSON.stringify({ error: 'Nuntec Integration is disabled or incorrectly configured.' }), { status: 500, headers: getCors(req) });
        }

        const authString = btoa(`${config.username}:${config.password}`);
        const fetchCfg = { headers: { Authorization: `Basic ${authString}` } };

        // Calculate Dates
        const now = new Date();
        now.setDate(now.getDate() - 30);
        const since = now.toISOString().split('.')[0]; // YYYY-MM-DDTHH:mm:ss

        // Data Fetching
        const [analysisRes, suppliesRes, companiesRes, fuelsRes, suppliersRes, postosRes] = await Promise.all([
            fetch(`${config.base_url}/supply_weight_measurements.xml?created_at=${since}`, fetchCfg),
            fetch(`${config.base_url}/supplies.xml?created_at=${since}`, fetchCfg),
            fetch(`${config.base_url}/companies.xml`, fetchCfg).catch(() => ({ ok: false, text: () => '' })),
            fetch(`${config.base_url}/fuels.xml`, fetchCfg).catch(() => ({ ok: false, text: () => '' })),
            fetch(`${config.base_url}/suppliers.xml`, fetchCfg).catch(() => ({ ok: false, text: () => '' })),
            supabase.from('postos').select('id, nome, nuntec_reservoir_id, fazenda:fazendas(nome)').not('nuntec_reservoir_id', 'is', null)
        ]);

        if (!analysisRes.ok || !suppliesRes.ok) {
            throw new Error('Failed to fetch primary data from Nuntec.');
        }

        const [analysisText, suppliesText, companiesText, fuelsText, suppliersText] = await Promise.all([
            analysisRes.text(),
            suppliesRes.text(),
            (companiesRes as any).text(),
            (fuelsRes as any).text(),
            (suppliersRes as any).text()
        ]);

        // Map Internal Stations
        const internalStationMap = new Map<string, { station: string, farm: string }>();
        if (postosRes.data) {
            postosRes.data.forEach((p: any) => {
                if (p.nuntec_reservoir_id) {
                    internalStationMap.set(String(p.nuntec_reservoir_id), {
                        station: p.nome,
                        farm: p.fazenda?.nome || 'Fazenda Desconhecida'
                    });
                }
            });
        }

        // Map Dictionaries
        const companiesMap = new Map<string, string>();
        getElements(companiesText as string, 'company').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) companiesMap.set(id, name);
        });

        const fuelsMap = new Map<string, string>();
        fuelsMap.set('1', 'Óleo Diesel');
        fuelsMap.set('2', 'Óleo Diesel');
        fuelsMap.set('4', 'Gasolina Comum');
        fuelsMap.set('5', 'Querosene');
        fuelsMap.set('6', 'AVGAS');
        getElements(fuelsText as string, 'fuel').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) fuelsMap.set(id, name);
        });

        const suppliersMap = new Map<string, string>();
        getElements(suppliersText as string, 'supplier').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) suppliersMap.set(id, name);
        });

        // Parse Analyses (Measurements)
        const getBaseNF = (inv: string) => inv?.match(/\d+/)?.[0] || inv?.trim() || '';
        const rawMeasurements = getElements(analysisText, 'supply-weight-measurement').map(node => {
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
            if (netWeight > 0 && currentDensity > 0) volAmbient = netWeight / currentDensity;
            const vol20c = (netWeight > 0 && density20c > 0) ? (netWeight / density20c) : 0;

            return {
                id: getTagValue(node, 'id') || '',
                invoiceNumber: getTagValue(node, 'invoice-number') || '',
                date: getTagValue(node, 'weighed-at') || getTagValue(node, 'created-at') || '',
                density: currentDensity,
                temperature: parseFloat(getTagValue(node, 'current-temperature') || '0'),
                volume: volAmbient,
                weight: rawWeight,
                supplier_name: supplierName,
                fuel_name: fuelName,
                fuel_id: fuelId || undefined,
                gross_weight: rawWeight,
                tare: tare,
                net_weight: netWeight,
                ticket_number: getTagValue(node, 'ticket-number') || '',
                density_20c: density20c,
                volume_20c: vol20c
            };
        });

        const measurementsMap = new Map<string, any>();
        rawMeasurements.forEach(m => {
            const base = getBaseNF(m.invoiceNumber);
            const key = `${base}-${m.fuel_id || 'unknown'}`; // Group by NF + Fuel
            
            if (!measurementsMap.has(key)) {
                measurementsMap.set(key, { 
                    ...m, 
                    originalInvoices: [m.invoiceNumber],
                    ids: [m.id],
                    weight: 0, gross_weight: 0, tare: 0, net_weight: 0, 
                    volume: 0, volume_20c: 0,
                    totalWeightedDensity: 0,
                    totalWeightedTemp: 0,
                    totalNetWeightForAverage: 0
                });
            }
            
            const group = measurementsMap.get(key);
            group.weight += m.weight;
            group.gross_weight += m.gross_weight;
            group.tare += m.tare;
            group.net_weight += m.net_weight;
            group.volume += m.volume;
            group.volume_20c += (m.volume_20c || 0);
            
            const w = m.net_weight || 1; 
            group.totalWeightedDensity += (m.density * w);
            group.totalWeightedTemp += (m.temperature * w);
            group.totalNetWeightForAverage += w;

            if (!group.originalInvoices.includes(m.invoiceNumber)) group.originalInvoices.push(m.invoiceNumber);
            if (!group.ids.includes(m.id)) group.ids.push(m.id);
            if (new Date(m.date) > new Date(group.date)) group.date = m.date;
        });

        const measurements = Array.from(measurementsMap.values()).map(m => ({
            ...m,
            id: m.ids.join(','),
            invoiceNumber: m.originalInvoices.join(' / '),
            density: m.totalNetWeightForAverage > 0 ? (m.totalWeightedDensity / m.totalNetWeightForAverage) : m.density,
            temperature: m.totalNetWeightForAverage > 0 ? (m.totalWeightedTemp / m.totalNetWeightForAverage) : m.temperature
        }));

        const validSupplies: any[] = [];
        const seenSupplyIds = new Set<string>();

        getElements(suppliesText, 'supply').forEach(node => {
            const id = getTagValue(node, 'id');
            if (!id || seenSupplyIds.has(id)) return;

            const pointingBlock = getTagValue(node, 'pointing') || '';
            const reservoirId = getTagValue(node, 'reservoir-id') || getTagValue(node, 'destination-id') || getTagValue(pointingBlock, 'reservoir-id');
            if (!reservoirId || !internalStationMap.has(reservoirId)) return;

            const invoiceNum = getTagValue(node, 'invoice-number')?.trim();
            if (!invoiceNum) return;

            seenSupplyIds.add(id);
            const internalData = internalStationMap.get(reservoirId)!;
            const fuelId = getTagValue(node, 'fuel-id') || getTagValue(pointingBlock, 'fuel-id');

            validSupplies.push({
                id,
                invoiceNumber: invoiceNum,
                volume: parseFloat(getTagValue(node, 'volume') || getTagValue(node, 'amount') || getTagValue(pointingBlock, 'amount') || '0'),
                date: getTagValue(node, 'issued-at') || getTagValue(node, 'date') || getTagValue(node, 'created-at'),
                internalData,
                fuelName: fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined,
                fuel_id: fuelId || undefined
            });
        });

        const auditResults: any[] = [];
        const groupedSupplies = new Map<string, any[]>();
        const consumedSupplyIds = new Set<string>();

        const isCompatibleFuel = (f1: string | undefined, f2: string | undefined) => {
            if (!f1 || !f2) return true;
            if (f1 === f2) return true;
            if ((f1 === '1' || f1 === '2') && (f2 === '1' || f2 === '2')) return true;
            return false;
        };

        const isDateClose = (d1: string, d2: string, maxDays = 10) => {
            const date1 = new Date(d1).getTime();
            const date2 = new Date(d2).getTime();
            if (isNaN(date1) || isNaN(date2)) return true;
            return Math.abs(date1 - date2) <= (maxDays * 24 * 60 * 60 * 1000);
        };

        validSupplies.forEach(supply => {
            const supplyNF = String(supply.invoiceNumber).trim();
            const supplyBaseNF = getBaseNF(supplyNF);

            const match = measurements.find(m => {
                if (!m.invoiceNumber) return false;
                if (supply.fuel_id && m.fuel_id && !isCompatibleFuel(supply.fuel_id, m.fuel_id)) return false;
                
                const measurementBaseNF = getBaseNF(m.invoiceNumber);
                const sameBase = (measurementBaseNF === supplyBaseNF) || (measurementBaseNF === supplyNF) || (m.invoiceNumber.includes(supplyNF) && supplyNF.length > 2);
                
                return sameBase && isDateClose(m.date, supply.date);
            });

            if (match) {
                if (!groupedSupplies.has(match.id)) groupedSupplies.set(match.id, []);
                groupedSupplies.get(match.id)!.push(supply);
                consumedSupplyIds.add(supply.id);
            }
        });

        groupedSupplies.forEach((supplies, measurementId) => {
            const measurement = measurements.find(m => m.id === measurementId)!;
            const totalVolume = supplies.reduce((acc, s) => acc + s.volume, 0);
            const firstSupply = supplies[0];
            const physicalVolume = (measurement.volume_20c && measurement.volume_20c > 0) ? measurement.volume_20c : measurement.volume;
            const diff = physicalVolume - totalVolume;
            const diffPercent = totalVolume > 0 ? (Math.abs(diff) / totalVolume) * 100 : 0;

            let conformity = 'conforming';
            if (Math.abs(diffPercent) > 0.6) conformity = 'non_conforming';
            if (measurement.density_20c && (measurement.density_20c < 0.8 || measurement.density_20c > 0.9)) conformity = 'non_conforming';

            auditResults.push({
                id: measurement.id,
                invoiceNumber: measurement.invoiceNumber,
                date: firstSupply.date || measurement.date,
                volume: totalVolume,
                unit_id: `${firstSupply.internalData.farm} - ${firstSupply.internalData.station}`,
                station_name: firstSupply.internalData.station,
                farm_name: firstSupply.internalData.farm,
                fuel_name: firstSupply.fuelName || measurement.fuel_name,
                status: 'ANALYZED',
                conformity, difference: diff, differencePercent: diffPercent,
                analysis: measurement,
                groupedSupplies: supplies.map(s => ({ id: s.id, invoiceNumber: s.invoiceNumber, volume: s.volume, date: s.date }))
            });
        });

        validSupplies.forEach(supply => {
            if (!consumedSupplyIds.has(supply.id)) {
                auditResults.push({
                    id: supply.id, invoiceNumber: supply.invoiceNumber,
                    date: supply.date, volume: supply.volume,
                    unit_id: `${supply.internalData.farm} - ${supply.internalData.station}`,
                    station_name: supply.internalData.station, farm_name: supply.internalData.farm,
                    fuel_name: supply.fuelName, status: 'MISSING_ANALYSIS',
                    conformity: 'unknown', difference: 0, differencePercent: 0, analysis: undefined
                });
            }
        });

        measurements.forEach(m => {
            if (!groupedSupplies.has(m.id)) {
                auditResults.push({
                    id: m.id, invoiceNumber: m.invoiceNumber,
                    date: m.date, volume: m.volume,
                    unit_id: 'Indefinido', station_name: 'Indefinido', farm_name: 'Indefinido',
                    fuel_name: m.fuel_name || 'Desconhecido', status: 'MISSING_ENTRY',
                    conformity: 'unknown', difference: 0, differencePercent: 0, analysis: m
                });
            }
        });

        const dataPayload = auditResults.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const totalVolume = dataPayload.reduce((acc, i) => acc + i.volume, 0);
        const totalDiff = dataPayload.reduce((acc, i) => acc + i.difference, 0);
        const analyzedCount = dataPayload.filter(i => i.status === 'ANALYZED').length;

        const responsePayload = {
            timestamp: new Date().toISOString(),
            stats: {
                totalVolume,
                totalDifference: totalDiff,
                analysisCoverage: dataPayload.length > 0 ? (analyzedCount / dataPayload.length) * 100 : 0,
                totalAnalyzed: analyzedCount,
                totalCount: dataPayload.length
            },
            data: dataPayload
        };

        return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
                ...getCors(req),
                'Content-Type': 'application/json'
            }
        });

    } catch (error: any) {
        console.error('Audit Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Error fetching Nuntec Data.' }), {
            status: 500,
            headers: { ...getCors(req), 'Content-Type': 'application/json' }
        });
    }
});
