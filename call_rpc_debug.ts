
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function callRpc() {
    console.log('Calling get_request_dashboard_stats RPC...');

    const start = '2026-02-01'; // Text format as expected by new function
    const end = '2026-02-28';

    const { data, error } = await supabase.rpc('get_request_dashboard_stats', {
        start_date: start, // Note: Param name matches what I reverted to
        end_date: end,
        filter_fazenda_id: null
    });

    if (error) {
        console.error('RPC Error:', error);
        return;
    }

    console.log('RPC Result (Overview):', data.overview);
    console.log('RPC Result (Classification Chart):', data.charts.by_classification);
}

callRpc();
