
import { format, subHours } from 'date-fns';
import { NuntecMeasurement } from '../../types';
import { getConfig, getAuthHeaders, fetchNuntec } from './api';
import { getTagValue, parseXML } from './parsers';

export async function getStockMeasurementsService(allowedReservoirIds?: string[], sinceDate?: Date | string): Promise<NuntecMeasurement[]> {
    const config = await getConfig();
    if (!config) return [];

    const headers = getAuthHeaders(config);

    try {
        let since: string;
        if (sinceDate) {
            since = typeof sinceDate === 'string' ? `${sinceDate.split('T')[0]}T00:00:00` : format(sinceDate, "yyyy-MM-dd'T'HH:mm:ss");
        } else {
            const now = new Date();
            const d = subHours(now, 72);
            since = format(d, "yyyy-MM-dd'T'HH:mm:ss");
        }

        const response = await fetchNuntec(`stock_pointings.xml?created_at=${since}`, config, headers);
        const xmlText = await response.text();
        const xmlDoc = parseXML(xmlText);

        const nodes = xmlDoc.getElementsByTagName('stock-pointing');
        const measurements: NuntecMeasurement[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const m = {
                id: getTagValue(node, 'id') || '',
                'operator-id': getTagValue(node, 'operator-id') || '',
                'reservoir-id': getTagValue(node, 'reservoir-id') || '',
                amount: parseFloat(getTagValue(node, 'amount') || '0'),
                'measured-at': getTagValue(node, 'measured-at') || '',
            };

            if (m.id && m['reservoir-id']) {
                if (allowedReservoirIds && allowedReservoirIds.length > 0 && !allowedReservoirIds.includes(m['reservoir-id'])) {
                    continue;
                }
                measurements.push(m);
            }
        }

        return measurements;
    } catch (error) {
        console.error('Error fetching Nuntec Stock:', error);
        return [];
    }
}
