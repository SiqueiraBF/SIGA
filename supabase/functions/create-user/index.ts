import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const getCors = (req: Request) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCors(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Create an admin client to perform admin actions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Extract auth token from the incoming request to verify the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    
    if (verifyError || !user) {
      throw new Error('Invalid token');
    }

    // Check if the caller is an Admin in the public database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('funcao:funcoes(nome)')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to verify user permissions');
    }

    const roleName = (userData.funcao as any)?.nome;
    if (roleName !== 'Administrador') {
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only administrators can create users.' }),
        { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Proceed to create user
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (createError) {
      throw createError;
    }

    return new Response(
      JSON.stringify({ user: authData.user }),
      { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
