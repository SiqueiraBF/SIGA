
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuration
const NUNTEC_BASE_URL = 'https://nadiana.nuntec.com.br';
// Using hardcoded credentials as fallback, ideally these should be env vars
const AUTH_USER = process.env.NUNTEC_USER || 'bruno.siqueira';
const AUTH_PASS = process.env.NUNTEC_PASS || '98765412';

interface AuditItem {
    id: string; // Unique ID (Supply ID)
    invoiceNumber: string;
    status: 'PENDING' | 'MATCHED' | 'MISSING_ANALYSIS' | 'MISSING_SUPPLY';
    date: string;
    unit: string; // Fazenda/Posto
    volumeInvoice: number;
    volumeAnalysis?: number;
    difference: number;
    differencePercent: number;
    conformity: 'conforming' | 'non_conforming' | 'unknown';
    conformityDetails: {
        density: string;
        temperature: number;
        water: string; // turbity?
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { days = '30' } = req.query;
        const authHeader = 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64');

        // Fetch Data in Parallel
        // We fetch a generous amount of data to ensure we find matches. 
        // Ideally the API supports date filtering. Using 'updated_at' or similar if available.
        // Based on user prompt, we need up to 1000 records.

        // 1. Fetch Analysis (Supply Weight Measurements)
        const analysisUrl = `${NUNTEC_BASE_URL}/supply_weight_measurements.xml`;
        // Note: The prompt endpoint was <supply-weight-measurements> which implies /supply_weight_measurements.xml based on standard Nuntec patterns seen in other files (snake_case or dash-case). 
        // Checking nuntecService.ts, they use /stock_pointings.xml, /transfers.xml. So /supply_weight_measurements.xml is a safe guess for <supply-weight-measurements>.

        // 2. Fetch Supplies (Entradas)
        const suppliesUrl = `${NUNTEC_BASE_URL}/supplies.xml`;

        const [analysisRes, suppliesRes] = await Promise.all([
            fetch(analysisUrl, { headers: { Authorization: authHeader } }),
            fetch(suppliesUrl, { headers: { Authorization: authHeader } })
        ]);

        if (!analysisRes.ok || !suppliesRes.ok) {
            throw new Error(`Failed to fetch data from Nuntec. Analysis: ${analysisRes.status}, Supplies: ${suppliesRes.status}`);
        }

        const [analysisXml, suppliesXml] = await Promise.all([
            analysisRes.text(),
            suppliesRes.text()
        ]);

        // Parse XMLs
        const measurements = parseMeasurementsCheck(analysisXml);
        const supplies = parseSuppliesCheck(suppliesXml);

        // Filter by Date (Optional, implementation valid for generic last 1000)
        // For O(n) performance, we create a Hash Map of the Analysis Data
        const analysisMap = new Map<string, any>();

        measurements.forEach(m => {
            // Key by Invoice Number. Handle potential duplicates by keeping the most recent or logging?
            // Assuming unique invoice numbers for simplicity, or we map to an array if multiple.
            if (m.invoiceNumber) {
                // Normalize invoice number (trim, remove leading zeros if needed?)
                const key = m.invoiceNumber.trim();
                analysisMap.set(key, m);
            }
        });

        // Build Audit Result
        const auditResults: AuditItem[] = [];

        // Process Supplies - logic: The Supply is the "Master" record of entry. We check if it was analyzed.
        supplies.forEach(supply => {
            const invoiceNum = supply.invoiceNumber?.trim();
            const match = invoiceNum ? analysisMap.get(invoiceNum) : undefined;

            let status: AuditItem['status'] = 'PENDING';
            if (!invoiceNum) {
                status = 'MATCHED'; // Or some other status for missing NF
            } else if (match) {
                status = 'MATCHED';
            } else {
                status = 'MISSING_ANALYSIS';
            }

            const volumeInvoice = supply.amount || 0;
            const volumeAnalysis = match?.amount || 0;

            // Calculate Difference
            // If matched, user prompt says "Volume Acumulado de Quebra (Soma do campo difference)" and "normalized-density".
            // The prompt XML shows <difference> tag in measurement. We should use that if available, or calc our own?
            // "Fonte A (Análise): ... difference"
            // So we use the difference from the analysis record.
            const difference = match?.difference || 0;

            // Difference % = (Difference / Volume) * 100
            const differencePercent = volumeInvoice > 0 ? (Math.abs(difference) / volumeInvoice) * 100 : 0;

            // Conformity Logic
            // "Destacar em vermelho linhas onde a difference seja superior a 0,5% do volume" -> executed in frontend
            // "ou campos de conformidade não sejam 'conforming'"
            const isConforming = !match || (
                (match.color === 'conforming' || !match.color) &&
                (match.turbity === 'conforming' || !match.turbity) &&
                (match.densityStatus === 'conforming' || !match.densityStatus) &&
                Math.abs(differencePercent) <= 0.5
            );

            auditResults.push({
                id: supply.id,
                invoiceNumber: invoiceNum || 'S/N',
                status: status,
                date: supply.datetime,
                unit: supply.unit || 'Posto Desconhecido',
                volumeInvoice: volumeInvoice,
                volumeAnalysis: volumeAnalysis,
                difference: difference,
                differencePercent: differencePercent,
                conformity: isConforming ? 'conforming' : 'non_conforming',
                conformityDetails: {
                    density: match?.density || 'N/A',
                    temperature: match?.temperature || 0,
                    water: match?.turbity || 'N/A'
                }
            });
        });

        // Sort by Date Descending
        auditResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.status(200).json({
            timestamp: new Date().toISOString(),
            stats: {
                totalReceived: auditResults.reduce((acc, item) => acc + item.volumeInvoice, 0),
                totalAnalyzed: measurements.length,
                analyzedPercentage: supplies.length > 0 ? (measurements.length / supplies.length) * 100 : 0, // Approximate
                totalDifference: auditResults.reduce((acc, item) => acc + (item.difference || 0), 0)
            },
            data: auditResults.slice(0, 1000) // Limit return
        });

    } catch (error: any) {
        console.error('Audit API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

// --- Helpers: Regex-based XML Parser (Node.js compatible) ---

function getTagValue(xmlSnippet: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = xmlSnippet.match(regex);
    return match ? match[1].trim() : null;
}

function parseMeasurementsCheck(xml: string): any[] {
    // Extract all <supply-weight-measurement> blocks
    const blockRegex = /<supply-weight-measurement>([\s\S]*?)<\/supply-weight-measurement>/g;
    const blocks = [...xml.matchAll(blockRegex)];

    return blocks.map(match => {
        const content = match[1];
        return {
            id: getTagValue(content, 'id'),
            invoiceNumber: getTagValue(content, 'invoice-number'),
            amount: parseFloat(getTagValue(content, 'amount') || '0'),
            difference: parseFloat(getTagValue(content, 'difference') || '0'),
            density: getTagValue(content, 'normalized-density'), // Value
            densityStatus: getTagValue(content, 'density'), // 'conforming' tag
            color: getTagValue(content, 'color'),
            turbity: getTagValue(content, 'turbity'),
            temperature: parseFloat(getTagValue(content, 'current-temperature') || '0'),
            date: getTagValue(content, 'weighed-at')
        };
    });
}

function parseSuppliesCheck(xml: string): any[] {
    // Extract all <supply> blocks
    const blockRegex = /<supply>([\s\S]*?)<\/supply>/g;
    const blocks = [...xml.matchAll(blockRegex)];

    return blocks.map(match => {
        const content = match[1];

        // Extract nested pointing info for Unit/Reservoir
        const pointingBlock = getTagValue(content, 'pointing') || '';
        const reservoirId = getTagValue(pointingBlock, 'reservoir-id');
        const fuelId = getTagValue(pointingBlock, 'fuel-id');
        const amount = parseFloat(getTagValue(pointingBlock, 'amount') || '0');

        return {
            id: getTagValue(content, 'id'),
            invoiceNumber: getTagValue(content, 'invoice-number'),
            datetime: getTagValue(content, 'datetime'),
            unit: `Reservatório ${reservoirId}`, // Simplification nicely handles missing map
            amount: amount
        };
    });
}
