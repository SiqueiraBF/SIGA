# Handoff Report: analyze-pdm Edge Function Update

## 1. Observation
- The Edge Function `analyze-pdm/index.ts` currently sends a prompt to Gemini requesting a 3-field JSON response (`status`, `descricao_padronizada`, `message`).
- The user is successfully authenticated at the start of the function, and `user.id` is available.
- The `itens_solicitacao` table is updated correctly if `simulate` is false, but there is no logging to `pdm_ai_logs`.
- The `pdm_ai_logs` table has been created (via migration `20260606221711_create_pdm_ai_logs.sql`) with the following relevant columns: `user_id`, `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, and `is_simulacao`.

## 2. Logic Chain
1. **Prompt Update**: To receive the `categoria_detectada` from the AI, the `aiPrompt` template string in `analyze-pdm/index.ts` (around line 95) must be modified to explicitly ask for exactly four fields instead of three.
2. **Logging Requirement**: The instruction requires inserting a record into `pdm_ai_logs`. This insert should be executed after parsing the AI response (`parsedResult`), before or after updating `itens_solicitacao`.
3. **Authentication Mapping**: The instruction mentions using the user's auth token or explicitly passing `user_id` via a service role. Since `supabaseAdmin` (service role) is already instantiated for database operations, it's safest to use it for the insert while explicitly passing `user_id: user.id`. The `user.id` is readily available from the `getUser` call at the beginning of the function.
4. **Resilience**: The logging action should fail gracefully (e.g., logging to `console.error`) rather than throwing an unhandled exception that crashes the function, ensuring the client still receives the AI response.

## 3. Caveats
- `itens_solicitacao` does not currently have a `categoria_detectada` column in its migrations, so the strategy only saves `categoria_detectada` to `pdm_ai_logs` as specified by the task.
- Ensure the prompt instructions clearly tell the AI what format to use for `categoria_detectada` to avoid unexpected data formats.

## 4. Conclusion
**Step-by-Step Fix Strategy for the Worker:**

**Step 1:** In `supabase/functions/analyze-pdm/index.ts`, update the `aiPrompt` string. Locate `## FORMATO DE RESPOSTA` and change the JSON example to expect 4 fields:
```typescript
## FORMATO DE RESPOSTA (JSON ÚNICO E OBRIGATÓRIO)
Retorne APENAS um JSON válido com EXATAMENTE estes quatro campos:
{
  "status": "Aprovado" | "FALTANDO_INFO",
  "descricao_padronizada": "STRING PADRONIZADA COM TODAS AS ABREVIAÇÕES APLICADAS",
  "categoria_detectada": "NOME DA CATEGORIA DETECTADA",
  "message": "Explicação do que foi formatado (se Aprovado) ou lista dos dados faltantes (se FALTANDO_INFO)."
}
```

**Step 2:** After the `parsedResult` parsing block (around line 174), add the code to insert the log into `pdm_ai_logs` using the `supabaseAdmin` client. Pass the `user.id` explicitly:
```typescript
    // 4.5 Insert log into pdm_ai_logs
    const { error: logError } = await supabaseAdmin
      .from('pdm_ai_logs')
      .insert({
        user_id: user.id,
        descricao_bruta: descricao,
        status_retornado: parsedResult.status || 'ERRO',
        categoria_detectada: parsedResult.categoria_detectada || null,
        mensagem_erro: parsedResult.status === "FALTANDO_INFO" ? parsedResult.message : null,
        descricao_padronizada: parsedResult.descricao_padronizada || null,
        is_simulacao: simulate || false
      })

    if (logError) {
      console.error("Failed to insert into pdm_ai_logs:", logError)
    }
```

**Step 3:** Ensure the existing `itens_solicitacao` update remains intact and correctly handles its state.

## 5. Verification Method
- **Code Inspection**: Review `analyze-pdm/index.ts` to confirm the prompt template expects 4 fields and the `supabaseAdmin.from('pdm_ai_logs').insert(...)` is implemented with `user_id: user.id`.
- **Runtime Testing**: Run a mock request to the `analyze-pdm` edge function and verify that a new row is created in the `pdm_ai_logs` table via Supabase dashboard or `psql`, and that the `categoria_detectada` contains the AI's predicted category.
