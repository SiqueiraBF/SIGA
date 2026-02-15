
import { supabase } from '../lib/supabase';

export const systemService = {
    /**
     * Busca um parâmetro do sistema pela chave.
     * Retorna o valor padrão se não encontrar ou der erro.
     */
    async getParameter(key: string, defaultValue: string = ''): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('system_parameters')
                .select('value')
                .eq('key', key)
                .single();

            if (error || !data) {
                // Se der erro (ex: tabela não existe ainda) ou não achar, retorna default
                console.warn(`Parâmetro '${key}' não encontrado ou erro. Usando padrão: '${defaultValue}'`);
                return defaultValue;
            }

            return data.value;
        } catch (err) {
            console.error(`Erro ao buscar parâmetro ${key}:`, err);
            return defaultValue;
        }
    },

    /**
     * Busca múltiplos parâmetros de uma vez para evitar várias chamadas.
     * Retorna um objeto { chave: valor }.
     */
    async getParameters(keys: string[]): Promise<Record<string, string>> {
        try {
            const { data, error } = await supabase
                .from('system_parameters')
                .select('key, value')
                .in('key', keys);

            if (error || !data) {
                return {};
            }

            const result: Record<string, string> = {};
            data.forEach(item => {
                result[item.key] = item.value;
            });
            return result;
        } catch (err) {
            console.error('Erro ao buscar múltiplos parâmetros:', err);
            return {};
        }
    },

    /**
     * Atualiza um parâmetro do sistema.
     */
    async updateParameter(key: string, value: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('system_parameters')
                .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
                .select();

            if (error) {
                console.error(`Erro ao atualizar parâmetro ${key}:`, error);
                return false;
            }

            if (!data || data.length === 0) {
                // Upsert deve sempre retornar dados se funcionar
                console.warn(`Atenção: O upsert do parâmetro ${key} não retornou dados. Verifique permissões.`);
                return false;
            }

            return true;
        } catch (err) {
            console.error(`Exceção ao atualizar parâmetro ${key}:`, err);
            return false;
        }
    },

    /**
     * Busca todos os parâmetros (útil para a tela de configurações)
     */
    async getAllParameters(): Promise<{ key: string; value: string; description: string }[]> {
        try {
            const { data, error } = await supabase
                .from('system_parameters')
                .select('*')
                .order('key');

            if (error || !data) return [];
            return data;
        } catch (err) {
            console.error('Erro ao buscar todos os parâmetros:', err);
            return [];
        }
    }
};
