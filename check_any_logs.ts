
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnyLogs() {
    console.log('Checking for ANY audit logs...');

    const { data: logs, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log(`Total Audit Logs in DB: ${count}`);

    if (count && count > 0) {
        const { data: sample } = await supabase
            .from('audit_logs')
            .select('*')
            .order('data_hora', { ascending: false })
            .limit(1);
        console.log('Reviewing latest log:', JSON.stringify(sample, null, 2));
    } else {
        console.log('WARNING: audit_logs table seems completely empty!');
    }
}

checkAnyLogs();
