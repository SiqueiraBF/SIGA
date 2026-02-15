
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableNames() {
    console.log('Checking distinct table names in audit_logs...');

    // Fetch a bunch of logs to see distinct table names
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('tabela')
        .order('data_hora', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const distinctNames = new Set(logs.map(l => l.tabela));
    console.log('Distinct Table Names found:', Array.from(distinctNames));
}

checkTableNames();
