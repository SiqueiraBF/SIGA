/**
 * Local Development Server for /api/audit
 * Mirrors the Vercel serverless function logic using pure Node.js (no extra deps).
 * Run with: node api/audit-dev-server.mjs
 * The Vite proxy forwards /api/audit → http://localhost:3001/api/audit
 *
 * Required env in .env.local:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Load .env.local manually (no dotenv needed) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
try {
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    });
    console.log('[dev-server] .env.local carregado com sucesso.');
} catch {
    console.warn('[dev-server] .env.local não encontrado — usando variáveis de ambiente do sistema.');
}

// --- Helper: fetch via Node https ---
function fetchText(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { ...headers, 'User-Agent': 'NadianaDevServer/1.0' }
        };
        https.get(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode < 400, text: () => data, status: res.statusCode }));
        }).on('error', reject);
    });
}

function getTagValue(xml, tag) {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? m[1].trim() : null;
}

function getElements(xml, tag) {
    return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map(m => m[1]);
}

// --- Supabase REST helper (no SDK needed in Node ESM) ---
async function supabaseQuery(url, key, table, query = '') {
    return new Promise((resolve, reject) => {
        const endpoint = `${url}/rest/v1/${table}${query}`;
        const parsed = new URL(endpoint);
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Accept: 'application/json'
            }
        };
        https.get(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve([]); }
            });
        }).on('error', reject);
    });
}

// --- Main Handler ---
async function handleAudit(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env.local');
        }

        // Fetch Nuntec config from Supabase
        const configs = await supabaseQuery(
            supabaseUrl, supabaseKey,
            'integration_settings',
            '?provider=eq.NUNTEC&limit=1'
        );

        const config = Array.isArray(configs) ? configs[0] : configs;

        if (!config || !config.is_active || !config.base_url || !config.username) {
            throw new Error('Integração Nuntec desativada ou não configurada na tabela integration_settings.');
        }

        const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
        const headers = { Authorization: authHeader };

        const now = new Date();
        now.setDate(now.getDate() - 30);
        const since = now.toISOString().split('.')[0];

        console.log(`[dev-server] Buscando dados Nuntec desde ${since}...`);

        const [analysisRes, suppliesRes, companiesRes, fuelsRes, suppliersRes] = await Promise.all([
            fetchText(`${config.base_url}/supply_weight_measurements.xml?created_at=${since}`, headers),
            fetchText(`${config.base_url}/supplies.xml?created_at=${since}`, headers),
            fetchText(`${config.base_url}/companies.xml`, headers).catch(() => ({ ok: false, text: () => '' })),
            fetchText(`${config.base_url}/fuels.xml`, headers).catch(() => ({ ok: false, text: () => '' })),
            fetchText(`${config.base_url}/suppliers.xml`, headers).catch(() => ({ ok: false, text: () => '' })),
        ]);

        if (!analysisRes.ok || !suppliesRes.ok) {
            throw new Error(`Falha ao buscar dados primários da Nuntec. Status analysis: ${analysisRes.status}, supplies: ${suppliesRes.status}`);
        }

        const analysisText = analysisRes.text();
        const suppliesText = suppliesRes.text();
        const companiesText = companiesRes.text();
        const fuelsText = fuelsRes.text();
        const suppliersText = suppliersRes.text();

        // Fetch internal station map from Supabase
        const postosData = await supabaseQuery(
            supabaseUrl, supabaseKey,
            'postos',
            '?select=id,nome,nuntec_reservoir_id,fazenda:fazendas(nome)&nuntec_reservoir_id=not.is.null'
        );

        const internalStationMap = new Map();
        if (Array.isArray(postosData)) {
            postosData.forEach(p => {
                if (p.nuntec_reservoir_id) {
                    internalStationMap.set(String(p.nuntec_reservoir_id), {
                        station: p.nome,
                        farm: p.fazenda?.nome || 'Fazenda Desconhecida'
                    });
                }
            });
        }
        console.log(`[dev-server] ${internalStationMap.size} postos mapeados.`);

        // Build lookup maps
        const companiesMap = new Map();
        getElements(companiesText, 'company').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) companiesMap.set(id, name);
        });

        const fuelsMap = new Map([['2', 'Óleo Diesel'], ['4', 'Gasolina Comum'], ['5', 'Querosene'], ['6', 'AVGAS']]);
        getElements(fuelsText, 'fuel').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) fuelsMap.set(id, name);
        });

        const suppliersMap = new Map();
        getElements(suppliersText, 'supplier').forEach(block => {
            const id = getTagValue(block, 'id');
            const name = getTagValue(block, 'name');
            if (id && name) suppliersMap.set(id, name);
        });

        // Parse analyses (measurements)
        const getBaseNF = (inv) => inv?.match(/\d+/)?.[0] || inv?.trim() || '';
        const rawMeasurements = getElements(analysisText, 'supply-weight-measurement').map(node => {
            const rawWeight = parseFloat(getTagValue(node, 'raw-total-weight') || '0');
            const tare = parseFloat(getTagValue(node, 'tare') || '0');
            const netWeight = rawWeight - tare;
            const supplierId = getTagValue(node, 'supplier-id');
            const fuelId = getTagValue(node, 'fuel-id');
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
                supplier_name: supplierId ? (suppliersMap.get(supplierId) || companiesMap.get(supplierId) || `Fornecedor ${supplierId}`) : undefined,
                fuel_name: fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined,
                fuel_id: fuelId || undefined,
                gross_weight: rawWeight,
                tare,
                net_weight: netWeight,
                ticket_number: getTagValue(node, 'ticket-number') || '',
                density_20c: density20c,
                volume_20c: vol20c
            };
        });

        // --- DT-15: Grouping logic for split deliveries (Truck split) ---
        const measurementsMap = new Map();
        rawMeasurements.forEach(m => {
            const base = getBaseNF(m.invoiceNumber);
            const key = `${base}-${m.fuel_id || 'unknown'}`;
            
            if (!measurementsMap.has(key)) {
                measurementsMap.set(key, { 
                    ...m, 
                    originalInvoices: [m.invoiceNumber],
                    ids: [m.id],
                    weight: 0, gross_weight: 0, tare: 0, net_weight: 0, 
                    volume: 0, volume_20c: 0,
                    totalWeightedDensity: 0, totalWeightedTemp: 0,
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

        // Parse supplies
        const validSupplies = [];
        const seenSupplyIds = new Set();
        getElements(suppliesText, 'supply').forEach(node => {
            const id = getTagValue(node, 'id');
            if (!id || seenSupplyIds.has(id)) return;
            const pointingBlock = getTagValue(node, 'pointing') || '';
            const reservoirId = getTagValue(node, 'reservoir-id') || getTagValue(node, 'destination-id') || getTagValue(pointingBlock, 'reservoir-id');
            if (!reservoirId || !internalStationMap.has(reservoirId)) return;
            const invoiceNum = getTagValue(node, 'invoice-number')?.trim();
            if (!invoiceNum) return;
            seenSupplyIds.add(id);
            const internalData = internalStationMap.get(reservoirId);
            const fuelId = getTagValue(node, 'fuel-id') || getTagValue(pointingBlock, 'fuel-id');
            validSupplies.push({
                id, invoiceNumber: invoiceNum,
                volume: parseFloat(getTagValue(node, 'volume') || getTagValue(node, 'amount') || getTagValue(pointingBlock, 'amount') || '0'),
                date: getTagValue(node, 'issued-at') || getTagValue(node, 'date') || getTagValue(node, 'created-at'),
                internalData,
                fuelName: fuelId ? (fuelsMap.get(fuelId) || `Combustível ${fuelId}`) : undefined,
                fuel_id: fuelId || undefined
            });
        });

        // Match and build audit results
        const auditResults = [];
        const groupedSupplies = new Map();
        const consumedSupplyIds = new Set();

        const isDateClose = (d1, d2, maxDays = 10) => {
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
                if (supply.fuel_id && m.fuel_id && supply.fuel_id !== m.fuel_id) return false;
                
                const measurementBaseNF = getBaseNF(m.invoiceNumber);
                const sameBase = (measurementBaseNF === supplyBaseNF) || (measurementBaseNF === supplyNF) || (m.invoiceNumber.includes(supplyNF) && supplyNF.length > 2);
                
                return sameBase && isDateClose(m.date, supply.date);
            });
            if (match) {
                if (!groupedSupplies.has(match.id)) groupedSupplies.set(match.id, []);
                groupedSupplies.get(match.id).push(supply);
                consumedSupplyIds.add(supply.id);
            }
        });

        groupedSupplies.forEach((supplies, measurementId) => {
            const measurement = measurements.find(m => m.id === measurementId);
            const totalVolume = supplies.reduce((acc, s) => acc + s.volume, 0);
            const firstSupply = supplies[0];
            const physicalVolume = (measurement.volume_20c && measurement.volume_20c > 0) ? measurement.volume_20c : measurement.volume;
            const diff = physicalVolume - totalVolume;
            const diffPercent = totalVolume > 0 ? (Math.abs(diff) / totalVolume) * 100 : 0;
            let conformity = 'conforming';
            if (Math.abs(diffPercent) > 0.6) conformity = 'non_conforming';
            if (measurement.density_20c && (measurement.density_20c < 0.8 || measurement.density_20c > 0.9)) conformity = 'non_conforming';

            auditResults.push({
                id: measurement.id, invoiceNumber: measurement.invoiceNumber,
                date: firstSupply.date || measurement.date,
                volume: totalVolume,
                unit_id: `${firstSupply.internalData.farm} - ${firstSupply.internalData.station}`,
                station_name: firstSupply.internalData.station, farm_name: firstSupply.internalData.farm,
                fuel_name: firstSupply.fuelName || measurement.fuel_name,
                status: 'ANALYZED', conformity, difference: diff, differencePercent: diffPercent,
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

        console.log(`[dev-server] ✅ ${dataPayload.length} registros processados (${analyzedCount} analisados).`);

        res.writeHead(200);
        res.end(JSON.stringify({
            timestamp: new Date().toISOString(),
            stats: {
                totalVolume, totalDifference: totalDiff,
                analysisCoverage: dataPayload.length > 0 ? (analyzedCount / dataPayload.length) * 100 : 0,
                totalAnalyzed: analyzedCount, totalCount: dataPayload.length
            },
            data: dataPayload
        }));

    } catch (err) {
        console.error('[dev-server] ❌ Erro:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
}

// --- Server ---
const PORT = 3001;
const server = http.createServer((req, res) => {
    if (req.url === '/api/audit' && req.method === 'GET') {
        handleAudit(req, res);
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`[dev-server] 🚀 Servidor de dev da API rodando em http://localhost:${PORT}`);
    console.log(`[dev-server] Rota disponível: GET http://localhost:${PORT}/api/audit`);
});
