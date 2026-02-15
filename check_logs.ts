
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('Checking audit_logs...');

    // Get some finalized requests
    const { data: requests } = await supabase
        .from('solicitacoes')
        .select('id, numero, status')
        .eq('status', 'Finalizado')
        .limit(5);

    if (!requests || requests.length === 0) {
        console.log('No finalized requests found.');
        return;
    }

    console.log(`Found ${requests.length} finalized requests.`);

    for (const req of requests) {
        console.log(`\nChecking Request #${req.numero} (${req.id})`);

        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('registro_id', req.id)
            .eq('tabela', 'solicitacoes')
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('Error fetching logs:', error);
            continue;
        }

        if (!logs || logs.length === 0) {
            console.log('  No audit logs found.');
        } else {
            logs.forEach(log => {
                console.log(`  [${log.data_hora}] ${log.acao}:`, JSON.stringify(log.dados_novos));
            });
        }
    }
}

checkLogs();
