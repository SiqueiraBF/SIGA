import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message || 'No user found in getUser'}`)
    }

    // 2. Parse request body
    const { item_id, descricao, marca, referencia, unidade, simulate } = await req.json()
    if (!descricao) {
      throw new Error('Missing item data (descricao)')
    }
    if (!simulate && !item_id) {
       throw new Error('Missing item data (item_id)')
    }

    // 3. Get PDM Config from DB (Bypassing RLS for settings if needed, or using service_role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: configRecord, error: configError } = await supabaseAdmin
      .from('sys_settings')
      .select('value')
      .eq('key', 'pdm_ai_config')
      .single()

    if (configError || !configRecord) {
      throw new Error('PDM config not found')
    }

    const config = configRecord.value as any

    if (!config.enabled) {
      return new Response(
        JSON.stringify({ message: "IA desativada." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Call Gemini AI with Dynamic Prioritized Cascade (3 models: 3.5 Flash -> 3.1 Flash Lite -> 2.5 Flash)
    const configModel = config.model || 'gemini-3.5-flash';
    const modelsToTry: string[] = [];
    
    // Se o modelo configurado for customizado, tenta ele primeiro
    const standardFlashes = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    if (!standardFlashes.includes(configModel)) {
      modelsToTry.push(configModel);
    }
    
    // Sempre prioriza o 3.5 Flash e usa o 3.1 Flash Lite e o 2.5 Flash como contingências subsequentes
    modelsToTry.push('gemini-3.5-flash');
    modelsToTry.push('gemini-3.1-flash-lite');
    modelsToTry.push('gemini-2.5-flash');
    
    const uniqueModels = [...new Set(modelsToTry)];
    
    const aiPrompt = `${config.prompt}

---
## DADOS DO ITEM PARA ANÁLISE
Descrição Bruta: ${descricao}
Marca: ${marca || '(não informada)'}
Referência: ${referencia || '(não informada)'}
Unidade: ${unidade}

## FORMATO DE RESPOSTA (JSON ÚNICO E OBRIGATÓRIO)
Retorne APENAS um JSON válido com EXATAMENTE estes quatro campos:
{
  "status": "Aprovado" | "FALTANDO_INFO",
  "categoria_detectada": "ID DA CATEGORIA DETECTADA (Ex: MATERIAIS_ELETRICOS) OU 'DESCONHECIDA'",
  "descricao_padronizada": "STRING PADRONIZADA COM TODAS AS ABREVIAÇÕES APLICADAS",
  "message": "Explicação do que foi formatado (se Aprovado) ou lista dos dados faltantes (se FALTANDO_INFO)."
}`

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: aiPrompt }] }],
      generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
    });

    const fetchGemini = async (model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
    };

    let aiResponse: Response | null = null;
    let lastErrorTxt = "";
    let lastStatus = 200;
    let activeModel = "";

    for (let i = 0; i < uniqueModels.length; i++) {
      const currentModel = uniqueModels[i];
      activeModel = currentModel;
      try {
        console.log(`Tentando analisar item com o modelo ${currentModel}...`);
        const response = await fetchGemini(currentModel);
        
        if (response.ok) {
          aiResponse = response;
          console.log(`Análise concluída com sucesso usando o modelo ${currentModel}.`);
          break; // Sucesso, sai do loop
        }
        
        lastStatus = response.status;
        lastErrorTxt = await response.text();
        console.warn(`Modelo ${currentModel} falhou com status ${lastStatus}: ${lastErrorTxt}`);
        
        // Se falhou por limite de cota (429) ou erro temporário (>= 500)
        if (lastStatus === 429 || lastStatus >= 500) {
          if (i < uniqueModels.length - 1) {
            console.log(`Iniciando fallback para o próximo modelo na fila...`);
            continue;
          }
        }
        
        // Para erros críticos de autenticação ou chaves inválidas (400, 403), falha imediatamente
        aiResponse = response;
        break;
      } catch (err: any) {
        console.error(`Erro de conexão com o modelo ${currentModel}:`, err.message);
        lastErrorTxt = err.message;
        lastStatus = 500;
        if (i < uniqueModels.length - 1) {
          continue;
        }
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      throw new Error(`Google Gemini API Error (${lastStatus}) no modelo ${activeModel}: ${lastErrorTxt || "Sem resposta detalhada do servidor."}`);
    }

    const aiResult = await aiResponse.json()
    const textContent = aiResult.candidates[0].content.parts[0].text
    
    let parsedResult
    try {
      parsedResult = JSON.parse(textContent)
    } catch (e) {
      console.error("Failed to parse Gemini response:", textContent)
      parsedResult = { status: "FALTANDO_INFO", categoria_detectada: "DESCONHECIDA", message: "Erro ao interpretar resposta da IA." }
    }

    // 4.5. Log into pdm_ai_logs
    const logData = {
      descricao_bruta: descricao,
      marca: marca || '',
      referencia: referencia || '',
      status_retornado: parsedResult.status,
      categoria_detectada: parsedResult.categoria_detectada,
      mensagem_erro: parsedResult.message,
      descricao_padronizada: parsedResult.descricao_padronizada,
      is_simulacao: !!simulate
    };

    const { error: logError } = await supabaseAdmin
      .from('pdm_ai_logs')
      .insert(logData);

    if (logError) {
      console.error("Failed to save AI log to pdm_ai_logs:", logError);
    }

    // 5. Update Item in DB (Se não for simulação)
    if (!simulate) {
      const { error: updateError } = await supabaseAdmin
        .from('itens_solicitacao')
        .update({
          analise_pdm_status: parsedResult.status,
          analise_pdm_msg: parsedResult.message,
          analise_pdm_padronizado: parsedResult.descricao_padronizada
        })
        .eq('id', item_id)

      if (updateError) {
        console.error("Failed to update item:", updateError)
        throw new Error(`Failed to save AI analysis: ${updateError.message}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, result: parsedResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Function error:", error.message)
    // Retornamos 200 para que o frontend (Supabase Client) não lance um FunctionsHttpError opaco
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
