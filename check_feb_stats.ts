
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFebStats() {
    console.log('Checking Stats for January 2026...');

    const startOfMonth = '2026-01-01T00:00:00.000Z';
    const endOfMonth = '2026-01-31T23:59:59.999Z';

    const { data: requests, error } = await supabase
        .from('solicitacoes')
        .select('id, numero, status, created_at, data_abertura, updated_at')
        .eq('status', 'Finalizado')
        .gte('data_abertura', startOfMonth)
        .lte('data_abertura', endOfMonth);

    if (error) {
        console.error('Error fetching requests:', error);
        return;
    }

    console.log(`Found ${requests?.length || 0} finalized requests in Feb.`);

    if (!requests || requests.length === 0) return;

    let totalDiff = 0;
    let count = 0;

    for (const req of requests) {
        // 1. Check Logs
        const { data: logs } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('registro_id', req.id)
            .eq('tabela', 'solicitacoes');

        const logStart = logs?.find(l => l.dados_novos?.status === 'Aguardando');
        const logEnd = logs?.find(l => l.dados_novos?.status === 'Finalizado');

        // Calculate Logic mimic SQL
        let start = logStart ? new Date(logStart.data_hora).getTime() : new Date(req.created_at).getTime();
        let startAlternative = new Date(req.data_abertura).getTime();
        let end = logEnd ? new Date(logEnd.data_hora).getTime() : new Date(req.updated_at).getTime();

        // If missing 'Aguardando' log (e.g. went straight to Finalizado or other flow), fallback to created_at
        // My SQL logic was: COALESCE(log_aguardando, created_at)

        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);

        const diffAltMs = end - startAlternative;
        const diffAltHours = diffAltMs / (1000 * 60 * 60);

        console.log(`\nReq #${req.numero}:`);
        console.log(`  Data Abertura: ${req.data_abertura}`);
        console.log(`  Created: ${req.created_at}`);
        console.log(`  Updated: ${req.updated_at}`);
        console.log(`  Log Start: ${logStart?.data_hora || 'N/A'}`);
        console.log(`  Log End:   ${logEnd?.data_hora || 'N/A'}`);
        console.log(`  Diff (Created -> Updated): ${diffHours.toFixed(4)}h`);
        console.log(`  Diff (Abertura -> Updated): ${diffAltHours.toFixed(4)}h`);

        totalDiff += diffHours;
        count++;
    }

    if (count > 0) {
        const avg = totalDiff / count;
        console.log(`\nAVERAGE SLA: ${avg.toFixed(4)}h`);
    }
}

checkFebStats();
