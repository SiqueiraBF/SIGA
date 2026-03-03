import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnv() {
    const content = fs.readFileSync('.env.production', 'utf8');
    const lines = content.split('\n');
    const envVars = {};
    for (const line of lines) {
        if (line && line.includes('=')) {
            const parts = line.split('=');
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    }
    return envVars;
}

const env = getEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Tentando criar função...');

    // Try inserting without id
    const { data, error } = await supabase.from('funcoes').insert({
        nome: 'Teste',
        modulos_permitidos: [],
        permissoes: {}
    }).select();

    if (error) {
        console.error('ERRO SUPABASE:');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log('SUCESSO:', data);
    }
}

run();
