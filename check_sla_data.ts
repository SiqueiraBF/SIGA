
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSLAData() {
    console.log('Checking SLA data availability...');

    // Get some finalized requests
    const { data: requests, error } = await supabase
        .from('solicitacoes')
        .select('id, numero, status, created_at')
        .eq('status', 'Finalizado')
        .limit(5);

    if (error) {
        console.error('Error fetching requests:', error);
        return;
    }

    if (!requests || requests.length === 0) {
        console.log('No finalized requests found.');
        return;
    }

    console.log(`Found ${requests.length} finalized requests.`);

    for (const req of requests) {
        console.log(`\nChecking Request #${req.numero} (${req.id})`);

        const { data: logs, error: logError } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('registro_id', req.id)
            .eq('tabela', 'solicitacoes')
            .order('data_hora', { ascending: true });

        if (logError) {
            console.error('Error fetching logs:', logError);
            continue;
        }

        let aguardandoTime = null;
        let finalizadoTime = null;

        if (!logs || logs.length === 0) {
            console.log('  No audit logs found.');
        } else {
            logs.forEach(log => {
                const status = log.dados_novos?.status;
                if (status) {
                    console.log(`  [${log.data_hora}] Status changed to: ${status}`);
                    if (status === 'Aguardando' && !aguardandoTime) aguardandoTime = log.data_hora;
                    if (status === 'Finalizado') finalizadoTime = log.data_hora;
                }
            });
        }

        if (aguardandoTime && finalizadoTime) {
            const start = new Date(aguardandoTime).getTime();
            const end = new Date(finalizadoTime).getTime();
            const diffHours = (end - start) / (1000 * 60 * 60);
            console.log(`  => SLA Duration: ${diffHours.toFixed(2)} hours`);
        } else {
            console.log('  => Incomplete data for SLA calculation.');
            if (!aguardandoTime) console.log('     Missing "Aguardando" log.');
            if (!finalizadoTime) console.log('     Missing "Finalizado" log.');
        }
    }
}

checkSLAData();
