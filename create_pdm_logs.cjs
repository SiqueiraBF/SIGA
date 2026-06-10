const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env.local';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.pdm_ai_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      descricao_bruta TEXT,
      marca TEXT,
      referencia TEXT,
      status_retornado TEXT,
      categoria_detectada TEXT,
      mensagem_erro TEXT,
      descricao_padronizada TEXT,
      is_simulacao BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("RPC fail, trying raw fetch...");
    const url = `${supabaseUrl}/rest/v1/rpc/execute_sql`;
    // We can't easily execute raw SQL via REST if the RPC doesn't exist.
    // I will write a migration file instead or use the CLI if available.
    console.log("Error:", error);
  } else {
    console.log("Table pdm_ai_logs created.");
  }
}

run();
