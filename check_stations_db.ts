
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStations() {
    const { data, error } = await supabase
        .from('postos')
        .select('id, nome, fazenda_id, exibir_na_drenagem, tipo')
        .order('nome');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total stations:', data.length);
    // Show all data to find Gerente types
    data.forEach((p: any) => console.log(`${p.nome} | Tipo: ${p.tipo} | Exibir: ${p.exibir_na_drenagem}`));

    const displayedInDrainage = data.filter((p: any) => p.exibir_na_drenagem === true);
    console.log('Explicitly TRUE count:', displayedInDrainage.length);

    const falseInDrainage = data.filter((p: any) => p.exibir_na_drenagem === false);
    console.log('Explicitly FALSE count:', falseInDrainage.length);

    const nullInDrainage = data.filter((p: any) => p.exibir_na_drenagem === null);
    console.log('NULL count:', nullInDrainage.length);
}

checkStations();
