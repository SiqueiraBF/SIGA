
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

const ids = [
    '30667', '30631', '30666', '30665', '30632', '30633',
    '30634', '30635', '30636', '30638', '30639', '30664',
    '30640', '30663', '30662', '30661', '30660', '30659',
    '30658', '30603', '30657', '30656', '30646', '30652',
    '30605', '30602', '30601', '30721', '30600', '30641',
    '30604', '30608', '30722', '30670', '30655', '30754'
];

async function checkRecords() {
    console.log('Checking for records with IDs:', ids.length);

    try {
        // Check nuntec_transfer_id
        const { data: byTransferId, error: err1 } = await supabase
            .from('abastecimentos')
            .select('id, nuntec_transfer_id, status')
            .in('nuntec_transfer_id', ids);

        console.log('--- Results by nuntec_transfer_id ---');
        if (err1) console.error('Error:', err1.message);
        else {
            console.log(`Found: ${byTransferId.length}`);
            byTransferId.forEach(r => console.log(`ID: ${r.id}, TransferID: ${r.nuntec_transfer_id}, Status: ${r.status}`));
        }

        // Check nuntec_generated_id (Just in case)
        const { data: byGeneratedId, error: err2 } = await supabase
            .from('abastecimentos')
            .select('id, nuntec_generated_id, status')
            .in('nuntec_generated_id', ids);

        console.log('\n--- Results by nuntec_generated_id ---');
        if (err2) console.error('Error:', err2.message);
        else {
            console.log(`Found: ${byGeneratedId.length}`);
            byGeneratedId.forEach(r => console.log(`ID: ${r.id}, GeneratedID: ${r.nuntec_generated_id}, Status: ${r.status}`));
        }

    } catch (e) {
        console.error('Script error:', e);
    }
}

checkRecords();
