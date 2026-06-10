import { NuntecOperator } from './types';
import { getConfig, getAuthHeaders, fetchNuntec } from './api';
import { getTagValue, parseXML } from './parsers';

export async function getOperatorsService(): Promise<NuntecOperator[]> {
    const config = await getConfig();
    if (!config) return [];

    const headers = getAuthHeaders(config);

    try {
        const response = await fetchNuntec('operators.xml', config, headers);
        const xmlText = await response.text();
        const xmlDoc = parseXML(xmlText);

        const nodes = xmlDoc.getElementsByTagName('operator');
        const operators: NuntecOperator[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const id = getTagValue(node, 'id');
            const name = getTagValue(node, 'name');
            const isTechnical = getTagValue(node, 'is-technical') === 'true';

            if (id && name) {
                operators.push({
                    id,
                    name: name.trim(),
                    is_technical: isTechnical
                });
            }
        }

        return operators;
    } catch (error) {
        console.error('Error fetching Nuntec Operators:', error);
        return [];
    }
}
