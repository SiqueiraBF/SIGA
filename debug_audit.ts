
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

const searchIdPrefix = '63ffeda3';

async function checkAuditLogs() {
    console.log(`Searching for Request with ID starting with: ${searchIdPrefix}`);

    try {
        // Fetch latest 200 requests
        const { data: requests, error: errReq } = await supabase
            .from('solicitacoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (errReq) {
            console.error('Error fetching requests:', errReq.message);
            return;
        }

        if (!requests) {
            console.log('No requests found in DB.');
            return;
        }

        const request = requests.find(r => r.id.startsWith(searchIdPrefix));

        if (!request) {
            console.log('No request found in the last 200 matches that prefix.');
            return;
        }

        console.log('Found Request:', request.id);
        console.log('Status:', request.status);

        // 2. Check Audit Logs for this Request
        console.log('\n--- Request Logs ---');
        const { data: reqLogs, error: errLog } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('registro_id', request.id);

        if (errLog) console.error('Error fetching logs:', errLog.message);
        else {
            console.log(`Count: ${reqLogs.length}`);
            reqLogs.forEach(l => console.log(`[${l.acao}] ${l.tabela} - ${l.data_hora}`));
        }

        // 3. Check Items
        console.log('\n--- Items ---');
        const { data: items, error: errItems } = await supabase
            .from('itens_solicitacao')
            .select('id, descricao')
            .eq('solicitacao_id', request.id);

        if (errItems) console.error('Error fetching items:', errItems.message);
        else {
            console.log(`Found Items: ${items.length}`);
            const itemIds = items.map(i => i.id);

            if (itemIds.length > 0) {
                const { data: itemLogs, error: errItemLogs } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .in('registro_id', itemIds);

                if (errItemLogs) console.error('Error fetching item logs:', errItemLogs.message);
                else {
                    console.log(`Item Logs Count: ${itemLogs.length}`);
                    itemLogs.forEach(l => console.log(`[${l.acao}] ${l.tabela} - ${l.data_hora}`));
                }
            }
        }

    } catch (e) {
        console.error('Script error:', e);
    }
}

checkAuditLogs();
