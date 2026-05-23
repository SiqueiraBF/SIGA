import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function getCors(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const isAllowed = origin.includes('localhost') || origin.endsWith('nadiana.com.br') || origin.endsWith('vercel.app');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://siga.nadiana.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCors(req) });
  }

  try {
    // Validação de Autenticação (Obrigatório estar logado)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: getCors(req) });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Cliente com super-poderes (Service Role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token validity
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    
    if (verifyError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers: getCors(req) });
    }

    // Buscar configurações da integração ativa
    const { data: configData, error: configError } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('provider', 'NUNTEC')
      .maybeSingle();

    if (configError || !configData) {
      return new Response(JSON.stringify({ error: 'Integração Nuntec não configurada ou desativada' }), { status: 500, headers: getCors(req) });
    }

    // Receber os parâmetros do Frontend
    const { endpoint, method = 'GET', body = null } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), { status: 400, headers: getCors(req) });
    }

    const nuntecUrl = `${configData.base_url || 'https://nadiana.nuntec.com.br'}${endpoint}`;
    const basicAuth = btoa(`${configData.username}:${configData.password}`);

    // Disparar requisição real para a Nuntec (escondida do Frontend)
    const nuntecResponse = await fetch(nuntecUrl, {
      method,
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      body: body ? body : undefined
    });

    const responseText = await nuntecResponse.text();

    return new Response(responseText, {
      status: nuntecResponse.status,
      headers: {
        ...getCors(req),
        'Content-Type': 'application/xml'
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCors(req), 'Content-Type': 'application/json' }
    });
  }
});
