# Handoff: `analyze-pdm` Edge Function Update

**Summary:** The `analyze-pdm` edge function needs to be updated to expect a 4-field JSON from the AI (including `categoria_detectada`) and to log the AI processing results into the `pdm_ai_logs` table.

## 1. Observation
- **Target File:** `supabase/functions/analyze-pdm/index.ts`
- **Current Prompt:** Around line 96, the `aiPrompt` explicitly requests exactly 3 fields: `status`, `descricao_padronizada`, and `message`.
- **Parsing Fallback:** Around line 172, if parsing fails, it defaults to a 2-field object.
- **Database Context:** `pdm_ai_logs` has columns: `id`, `user_id`, `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`, `created_at`.
- **Auth Context:** A user-authenticated Supabase client is initialized at line 22 (`supabaseClient`). The user object is fetched at line 29, so `user.id` is available in scope. `pdm_ai_logs` RLS requires `user_id = auth.uid()`.

## 2. Logic Chain
1. To obtain `categoria_detectada` from the AI, the prompt string must be updated to specify "quatro campos" and include `"categoria_detectada"` in the expected JSON format.
2. The catch block for JSON parsing needs to include `categoria_detectada: null` in its fallback object to prevent missing-property errors later.
3. The logs must be inserted after `parsedResult` is evaluated and before the function updates `itens_solicitacao` (or returns).
4. The insertion must respect RLS. By using `supabaseClient` (which is instantiated with the `Authorization` header) and passing `user_id: user.id` explicitly, the query perfectly satisfies `WITH CHECK (user_id = auth.uid())` without requiring service role bypass for the log entry.

## 3. Caveats
- No caveats. The `user.id` is strictly checked at the top of the function.

## 4. Conclusion & Actionable Strategy
The implementation should proceed with the following steps in `supabase/functions/analyze-pdm/index.ts`:

**Step 1:** Update the AI prompt.
Change the expected JSON fields constraint from 3 to 4 fields in `aiPrompt` (around line 96).
```typescript
## FORMATO DE RESPOSTA (JSON ÚNICO E OBRIGATÓRIO)
Retorne APENAS um JSON válido com EXATAMENTE estes quatro campos:
{
  "status": "Aprovado" | "FALTANDO_INFO",
  "descricao_padronizada": "STRING PADRONIZADA COM TODAS AS ABREVIAÇÕES APLICADAS",
  "categoria_detectada": "Nome da Categoria (ex: PEÇAS, FERTILIZANTES, etc) se detectada, ou null",
  "message": "Explicação do que foi formatado (se Aprovado) ou lista dos dados faltantes (se FALTANDO_INFO)."
}
```

**Step 2:** Update the JSON parsing error fallback.
Ensure `parsedResult` has `categoria_detectada` on error (around line 172):
```typescript
parsedResult = { status: "FALTANDO_INFO", message: "Erro ao interpretar resposta da IA.", categoria_detectada: null }
```

**Step 3:** Insert the log record into `pdm_ai_logs`.
Add the following block right after the `try/catch` that assigns `parsedResult` (around line 174):
```typescript
// Insert log into pdm_ai_logs
const { error: logError } = await supabaseClient
  .from('pdm_ai_logs')
  .insert({
    user_id: user.id,
    descricao_bruta: descricao,
    status_retornado: parsedResult.status,
    categoria_detectada: parsedResult.categoria_detectada || null,
    mensagem_erro: parsedResult.status !== 'Aprovado' ? parsedResult.message : null,
    descricao_padronizada: parsedResult.descricao_padronizada || null,
    is_simulacao: !!simulate
  });

if (logError) {
  console.error("Failed to insert into pdm_ai_logs:", logError);
}
```

## 5. Verification Method
1. Deploy the edge function: `supabase functions deploy analyze-pdm`.
2. Send a valid POST request to the function, including the Authorization header with a valid user token.
3. Check the Supabase table `pdm_ai_logs` via the dashboard or a SQL query (`SELECT * FROM pdm_ai_logs ORDER BY created_at DESC LIMIT 1`) to confirm the log was correctly recorded, including the AI-returned `categoria_detectada` and correct `user_id`.
