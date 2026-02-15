
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo'; // Public Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFallbackData() {
  console.log('Checking Fallback data...');
  
  const { data: requests, error } = await supabase
    .from('solicitacoes')
    .select('id, numero, status, created_at, data_abertura, updated_at')
    .eq('status', 'Finalizado')
    .limit(10);

  if (error) {
     console.error('Error fetching requests:', error);
     return;
  }

  if (!requests || requests.length === 0) {
    console.log('No finalized requests found.');
    return;
  }

  console.log('ID | Numero | Data Abertura | Updated At | Diff Hours');
  console.log('---|---|---|---|---');

  requests.forEach(req => {
      const start = new Date(req.data_abertura).getTime();
      const end = new Date(req.updated_at).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);
      
      console.log(`${req.numero.toString().padEnd(6)} | ${req.data_abertura} | ${req.updated_at} | ${diffHours.toFixed(2)}h`);
  });
}

checkFallbackData();
