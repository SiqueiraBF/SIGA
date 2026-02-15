
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking columns for table: itens_solicitacao');

    // Method 1: Select a single row and print keys
    const { data, error } = await supabase
        .from('itens_solicitacao')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching row:', error);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('Columns found:', columns);

        if (columns.includes('tipo_tratativa')) {
            console.log('\n"tipo_tratativa" FOUND!');
            // Check some values
            const { data: values } = await supabase
                .from('itens_solicitacao')
                .select('tipo_tratativa')
                .limit(20);
            console.log('Sample values:', values);
        } else {
            console.log('\n"tipo_tratativa" NOT found in columns.');
        }
    } else {
        console.log('Table appears empty, cannot infer columns from data.');
    }
}

checkColumns();
