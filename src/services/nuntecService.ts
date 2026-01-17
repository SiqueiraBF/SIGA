import { Abastecimento, Posto, NuntecTransfer, NuntecPointing } from '../types';
import { db } from './supabaseService'; // Import DB wrapper

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

    const url = `${testConfig.base_url || DEFAULTS.BASE_URL}/transfers.xml?updated_after=${
      testConfig.sync_start_date || DEFAULTS.START_DATE_SYNC
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
