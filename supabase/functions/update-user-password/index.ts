import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const getCors(req) = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { userId, password } = await req.json();

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: 'User ID and password are required' }),
        { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check permissions
    // 1. Is the caller updating their own password?
    // 2. Is the caller an Administrator?
    
    let isAuthorized = false;
    
    if (user.id === userId) {
      isAuthorized = true; // User can update their own password
    } else {
      // Check if the caller is an Admin
      const { data: userData, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('funcao:funcoes(nome)')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to verify user permissions');
      }

      const roleName = (userData.funcao as any)?.nome;
      if (roleName === 'Administrador') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only administrators can update other users passwords.' }),
        { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Proceed to update user password
    const { data: authData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    );

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...getCors(req), 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
