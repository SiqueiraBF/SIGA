
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuery() {
    const fazendaId = '4dcc6c71-3e91-48ae-8300-f208b501afe7'; // Caregi ? containing Melosa

    console.log('Testing query with fazendaId:', fazendaId);

    let query = supabase
        .from('postos')
        .select('id, nome, fazenda_id, exibir_na_drenagem')
        .order('nome');

    query = query.eq('fazenda_id', fazendaId);

    // Apply logic
    query = query.or('exibir_na_drenagem.eq.true,exibir_na_drenagem.is.null');

    const { data, error } = await query;

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Returned Stations:', data.length);
    data.forEach(p => console.log(`- ${p.nome} (${p.exibir_na_drenagem})`));
}

checkQuery();
