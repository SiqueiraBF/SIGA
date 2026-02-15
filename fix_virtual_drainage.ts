
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVirtualDrainage() {
    console.log('Fixing VIRTUAL stations drainage flag...');

    // 1. Find all non-FISICO stations
    const { data: stations, error } = await supabase
        .from('postos')
        .select('id, nome, tipo, exibir_na_drenagem')
        .neq('tipo', 'FISICO'); // Assuming 'FISICO' is the only one that should have drainage

    if (error) {
        console.error('Error finding stations:', error);
        return;
    }

    console.log(`Found ${stations.length} non-FISICO stations.`);

    // 2. Update them
    const updates = stations.map(async (station: any) => {
        if (station.exibir_na_drenagem === false) return; // Already correct

        console.log(`Updating ${station.nome} (${station.tipo})...`);
        const { error: updateError } = await supabase
            .from('postos')
            .update({ exibir_na_drenagem: false })
            .eq('id', station.id);

        if (updateError) {
            console.error(`Failed to update ${station.nome}:`, updateError);
        } else {
            console.log(`Updated ${station.nome} to FALSE.`);
        }
    });

    await Promise.all(updates);
    console.log('Done.');
}

fixVirtualDrainage();
