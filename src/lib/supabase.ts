import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wufvpptcolbdbwdtcugv.supabase.co';
const supabaseAnonKey = 'sb_publishable_6n2wtcAyxEPPo6XZxeCDFg_mjnFoHNo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
