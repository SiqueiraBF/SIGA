
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItemStatus() {
    console.log('Checking Item Statuses for February 2026...');

    const startOfMonth = '2026-02-01T00:00:00.000Z';
    const endOfMonth = '2026-02-28T23:59:59.999Z';

    // 1. Get IDs of requests created in Feb
    const { data: requests, error: errReq } = await supabase
        .from('solicitacoes')
        .select('id, numero, data_abertura')
        .gte('data_abertura', startOfMonth)
        .lte('data_abertura', endOfMonth);

    if (errReq) { console.error(errReq); return; }

    console.log(`Requests in Feb: ${requests.length}`);
    const reqIds = requests.map(r => r.id);

    if (reqIds.length === 0) return;

    // 2. Get Items for these requests
    const { data: items, error: errItems } = await supabase
        .from('itens_solicitacao')
        .select('id, description:descricao, status_item')
        .in('solicitacao_id', reqIds);

    if (errItems) { console.error(errItems); return; }

    console.log(`Total Items found: ${items.length}`);

    // 3. Group by status
    const stats: Record<string, number> = {};
    items.forEach(i => {
        const s = i.status_item || 'NULL';
        stats[s] = (stats[s] || 0) + 1;
    });

    console.log('Status Distribution:', stats);
}

checkItemStatus();
