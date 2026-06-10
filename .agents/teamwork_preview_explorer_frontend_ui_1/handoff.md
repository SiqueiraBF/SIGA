# Handoff: Frontend UI Implementation Plan for PdmManual

## Observation
1. **Scope Requirements**: `SCOPE.md` requires:
   - A new tab "Análise de IA" in `PdmManual` that displays logs from `pdm_ai_logs` where `status_retornado != 'Aprovado'`.
   - A copy-to-clipboard feature for `descricao_bruta` directly from the table row.
   - An update to `compilePromptMarkdown` in `PdmManual/index.tsx` to ask the AI for `categoria_detectada`.
2. **Current Code State**: 
   - `src/components/RequestForm/PdmManual/index.tsx` handles configuration via a `TabBar` component (currently showing Categorias, Abreviações, and Prompt Markdown).
   - `compilePromptMarkdown` explicitly asks for a JSON return with only three fields (`status`, `descricao_padronizada`, `message`) in step 6 and in the FALLBACK section.
   - `supabaseService.ts` currently lacks a method to fetch from the `pdm_ai_logs` table.
   - The `pdm_ai_logs` table exists in the database schema (`20260606221711_create_pdm_ai_logs.sql`) and contains columns: `id`, `user_id`, `descricao_bruta`, `status_retornado`, `categoria_detectada`, `mensagem_erro`, `descricao_padronizada`, `is_simulacao`, `created_at`.
3. **UI Components**: The project uses `DataTable` from `src/components/ui/DataTable.tsx` to render tables in a "Solid/Blue Premium" pattern (seen in `AbbreviationEditor.tsx`).

## Logic Chain
1. **Data Fetching**: To display logs, the backend service needs a new method. We must add `getPdmAiLogs()` to `src/services/supabaseService.ts` that queries `supabase.from('pdm_ai_logs').select('*').neq('status_retornado', 'Aprovado').order('created_at', { ascending: false })`.
2. **New UI Component**: Create `src/components/RequestForm/PdmManual/AiLogsViewer.tsx`. 
   - This component will load the logs using the new service method.
   - It will render a `DataTable` matching the existing UI patterns.
   - The columns will include Data, Status (using `<StatusBadge>`), Categoria (`categoria_detectada`), Mensagem, and Descrição Bruta.
   - The "Descrição Bruta" column cell will render the text alongside a `<Button variant="ghost" icon={Copy} />` that triggers `navigator.clipboard.writeText()` and `toast.success()`.
3. **Integrating the Tab**: In `src/components/RequestForm/PdmManual/index.tsx`:
   - Update the `configTab` state type to include `'LOGS_IA'`.
   - Add `{ id: 'LOGS_IA', label: 'Análise de IA' }` to the `TabBar` configuration.
   - Add a conditional rendering block for `configTab === 'LOGS_IA'` that displays `<AiLogsViewer />`.
4. **Updating the AI Prompt**: In `compilePromptMarkdown` within `index.tsx`:
   - Update the `FALLBACK` text: add `- categoria_detectada: "DESCONHECIDA"`.
   - Update step 6 of `ROTEIRO DE ANÁLISE`: instruct the model to return 4 fields, adding `categoria_detectada` with the ID of the category or "DESCONHECIDA".

## Caveats
- The `AiLogsViewer` component will use a local `useEffect` for data fetching instead of React Query, to match the legacy state management style of the `PdmManual` module.
- We are fetching all non-approved logs. If the volume of logs grows significantly, pagination at the database level might be necessary, though `DataTable` handles client-side pagination. For now, a simple `.limit(100)` or standard query is sufficient for an admin view.

## Conclusion
The implementation is straightforward and purely additive. 
1. Update `supabaseService.ts` with `getPdmAiLogs`.
2. Create `AiLogsViewer.tsx` using `DataTable` and Lucide's `Copy` icon.
3. Hook `AiLogsViewer` into the `TabBar` of `PdmManual/index.tsx`.
4. Modify the markdown string in `compilePromptMarkdown` to require `categoria_detectada`.

## Verification Method
1. Build the application using the project's build command (`npm run build` or `vite build`) to ensure no TypeScript errors.
2. Open the UI, navigate to the PDM configuration view, and click the new "Análise de IA" tab.
3. Ensure the table renders correctly, empty state or with data, and that clicking the copy icon successfully triggers the clipboard action and toast notification.
4. Verify that saving the PDM configuration correctly updates the `pdm_ai_config` prompt with the new `categoria_detectada` instructions.
