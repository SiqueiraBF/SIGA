
import { db } from '../supabaseService';
import { DEFAULTS, NuntecConfig } from './types';

/**
 * loads the active Nuntec configuration from the database or falls back to defaults.
 */
export async function getConfig(): Promise<NuntecConfig | null> {
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
    return DEFAULTS;
}

/**
 * Creates formatted headers for Basic Auth
 */
export function getAuthHeaders(config: NuntecConfig): Headers {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.AUTH_USER}:${config.AUTH_PASS}`));
    return headers;
}

/**
 * Generic fetch wrapper for Nuntec API
 */
export async function fetchNuntec(endpoint: string, config: NuntecConfig, headers: Headers): Promise<Response> {
    const url = `${config.BASE_URL}/${endpoint}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Nuntec API Request Failed: ${response.status} ${response.statusText} at ${endpoint}`);
    }
    return response;
}
