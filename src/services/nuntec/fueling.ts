
import { NuntecFueling as NuntecFuelingType, Veiculo as VeiculoType, NuntecFueling } from './types';
import { getConfig, getAuthHeaders, fetchNuntec } from './api';
import { getTagValue, parseXML } from './parsers';
import { parseISO, isAfter, isBefore, endOfDay } from 'date-fns';

export async function getFuelingConsistencyService(startDate: string, endDate: string): Promise<NuntecFuelingType[]> {
    const config = await getConfig();
    if (!config) return [];

    const headers = getAuthHeaders(config);

    try {
        // Fetch Fuelings
        // Using created_at filter to get data from start date
        const fuelingsRes = await fetchNuntec(`fuelings.xml?created_at=${startDate}T00:00:00&limit=10000`, config, headers);
        const fuelingsText = await fuelingsRes.text();
        const fuelingsDoc = parseXML(fuelingsText);

        // Fetch Auxiliary Data for Mapping
        const [vehiclesRes, stationsRes, operatorsRes] = await Promise.all([
            fetchNuntec('vehicles.xml', config, headers),
            fetchNuntec('stations.xml', config, headers),
            fetchNuntec('operators.xml', config, headers)
        ]);

        // Parse Maps
        const vehicleMap = new Map<string, string>();
        const stationMap = new Map<string, string>();
        const operatorMap = new Map<string, string>();

        // Vehicles
        try {
            const vDoc = parseXML(await vehiclesRes.text());
            const vNodes = vDoc.getElementsByTagName('vehicle');
            for (let i = 0; i < vNodes.length; i++) {
                const id = getTagValue(vNodes[i], 'id');
                const name = getTagValue(vNodes[i], 'identification') || getTagValue(vNodes[i], 'name');
                if (id && name) vehicleMap.set(id, name);
            }
        } catch (e) { console.warn('Failed to parse vehicles map', e); }

        // Stations
        try {
            const sDoc = parseXML(await stationsRes.text());
            const sNodes = sDoc.getElementsByTagName('station');
            for (let i = 0; i < sNodes.length; i++) {
                const id = getTagValue(sNodes[i], 'id');
                const name = getTagValue(sNodes[i], 'name');
                if (id && name) stationMap.set(id, name);
            }
        } catch (e) { console.warn('Failed to parse stations map', e); }

        // Operators
        try {
            const oDoc = parseXML(await operatorsRes.text());
            const oNodes = oDoc.getElementsByTagName('operator');
            for (let i = 0; i < oNodes.length; i++) {
                const id = getTagValue(oNodes[i], 'id');
                const name = getTagValue(oNodes[i], 'name');
                if (id && name) operatorMap.set(id, name);
            }
        } catch (e) { console.warn('Failed to parse operators map', e); }

        // Parse Fuelings
        const nodes = fuelingsDoc.getElementsByTagName('fueling');
        const fuelings: NuntecFuelingType[] = [];
        const start = parseISO(startDate);
        const end = endOfDay(parseISO(endDate));

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const dateStr = getTagValue(node, 'start-at') || getTagValue(node, 'end-at') || getTagValue(node, 'created-at'); // Field 'start-at' is preferred for audit
            if (!dateStr) continue;

            const date = parseISO(dateStr);
            if (isBefore(date, start) || isAfter(date, end)) continue;

            // Extract Pointing for Amount
            const pointingNode = node.getElementsByTagName('pointing')[0];
            let amount = 0;
            let reservoirId = '';

            if (pointingNode) {
                amount = Math.abs(parseFloat(getTagValue(pointingNode, 'amount') || '0'));
                reservoirId = getTagValue(pointingNode, 'reservoir-id') || '';
            }

            const id = getTagValue(node, 'id') || '';
            const vehicleId = getTagValue(node, 'vehicle-id') || '';
            const stationId = getTagValue(node, 'station') || ''; // XML uses 'station' tag for ID usually
            const operatorId = getTagValue(node, 'operator-id') || '';
            const hourmeter = parseFloat(getTagValue(node, 'hourmeter') || '0');
            const odometer = parseFloat(getTagValue(node, 'odometer') || '0'); // Assuming tag name

            if (id) {
                fuelings.push({
                    id,
                    stationId,
                    vehicleId,
                    operatorId,
                    reservoirId,
                    date: dateStr,
                    amount,
                    hourmeter,
                    odometer,
                    vehicleName: vehicleMap.get(vehicleId) || `Veículo ${vehicleId}`,
                    stationName: stationMap.get(stationId) || `Estação ${stationId}`,
                    operatorName: operatorMap.get(operatorId) || `Operador ${operatorId}`
                });
            }
        }

        return fuelings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
        console.error('Error fetching Fueling Consistency:', error);
        return [];
    }
}
