
import { Veiculo } from '../../types';
import { getConfig, getAuthHeaders, fetchNuntec } from './api';
import { getTagValue, parseXML } from './parsers';

export async function getVehiclesService(): Promise<Veiculo[]> {
    const config = await getConfig();
    if (!config) return [];

    const headers = getAuthHeaders(config);

    try {
        const response = await fetchNuntec('vehicles.xml', config, headers);
        const xmlText = await response.text();
        const xmlDoc = parseXML(xmlText);

        // Handle both <vehicle> and <vehicle-module> tags
        let nodes = xmlDoc.getElementsByTagName('vehicle');
        if (nodes.length === 0) {
            nodes = xmlDoc.getElementsByTagName('vehicle-module');
        }

        const vehicles: Veiculo[] = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const id = getTagValue(node, 'id') || getTagValue(node, 'vehicle-id');
            // User requested to prioritize identification
            const name = getTagValue(node, 'identification') || getTagValue(node, 'name') || `Veículo ${id}`;
            const activeText = getTagValue(node, 'active') || getTagValue(node, 'status');

            if (id === '510') {
                console.log('--- DEBUG VEICULO 510 ---');
                console.log('Raw Node:', new XMLSerializer().serializeToString(node));
                console.log('Extracted ID:', id);
                console.log('Extracted Name:', name);
                console.log('Tag identification:', getTagValue(node, 'identification'));
                console.log('Tag name:', getTagValue(node, 'name'));
                console.log('-------------------------');
            }
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
}
