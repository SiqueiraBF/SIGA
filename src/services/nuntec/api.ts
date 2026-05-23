
import { db } from '../supabaseService';
import { supabase } from '../../lib/supabase';
import { DEFAULTS, NuntecConfig } from './types';

/**
 * loads the active Nuntec configuration from the database or falls back to defaults.
 */
export async function getConfig(): Promise<NuntecConfig | null> {
    try {
        const config = await db.getIntegrationConfig();
        if (config) {
            if (!config.is_active) return null; // Explicitly disabled

            // Bypass CORS in all environments: Force local proxy if running in browser
            const isBrowser = typeof window !== 'undefined';
            const defaultRemoteUrl = 'https://nadiana.nuntec.com.br';
            const baseUrl = isBrowser ? DEFAULTS.BASE_URL : (config.base_url || defaultRemoteUrl);

            return {
                BASE_URL: baseUrl,
                START_DATE_SYNC: config.sync_start_date
                    ? `${config.sync_start_date}T00:00:00`
                    : DEFAULTS.START_DATE_SYNC,
                AUTH_USER: 'PROTEGIDO',
                AUTH_PASS: 'PROTEGIDO',
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
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    const { data, error } = await supabase.functions.invoke('nuntec-proxy', {
        body: { endpoint: endpoint, method: 'GET' }
    });
    
    if (error) {
        throw new Error(`Nuntec Proxy Request Failed: ${error.message}`);
    }
    
    return new Response(data, { status: 200 });
}

