import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']; // Using service role key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching users...');
  const { data: users, error: usersError } = await supabase.from('usuarios').select('id, nome');
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  if (!users || users.length === 0) {
    console.error('No users found in database.');
    return;
  }

  const usersMap = new Map<string, string>();
  for (const u of users) {
    usersMap.set(u.nome.toLowerCase().trim(), u.id);
  }

  // Fallback user: preferably "bruno", else the first user
  let fallbackUserId = users[0].id;
  const adminUser = users.find(u => u.nome.toLowerCase().includes('bruno') || u.nome.toLowerCase().includes('admin'));
  if (adminUser) {
    fallbackUserId = adminUser.id;
  }
  console.log('Fallback user ID:', fallbackUserId);

  console.log('Fetching savings...');
  const { data: savings, error: savingsError } = await supabase.from('savings').select('id, comprador');
  if (savingsError) {
    console.error('Error fetching savings:', savingsError);
    return;
  }

  let updatedCount = 0;
  for (const s of savings) {
    let compradorName = s.comprador ? s.comprador.toLowerCase().trim() : '';
    let userId = usersMap.get(compradorName) || fallbackUserId;

    if (!userId) continue;

    console.log(`Updating saving ${s.id} (comprador: "${s.comprador}") => created_by: ${userId}`);
    const { error: updateError } = await supabase.from('savings').update({ created_by: userId }).eq('id', s.id);
    
    if (updateError) {
      console.error(`Error updating saving ${s.id}:`, updateError);
    } else {
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount}/${savings.length} savings.`);
}

migrate().catch(console.error);
