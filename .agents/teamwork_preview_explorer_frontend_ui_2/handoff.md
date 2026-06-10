# Handoff Report: frontend_ui for PdmManual

## Observation
- The scope requires adding a new "Análise de IA" tab for viewing logs from `pdm_ai_logs` where `status_retornado` != 'Aprovado'.
- The tab must include a copy-to-clipboard functionality for `descricao_bruta`.
- The `compilePromptMarkdown` function in `src/components/RequestForm/PdmManual/index.tsx` must be updated to ask the AI model for `categoria_detectada`.
- Examined `src/components/RequestForm/PdmManual/index.tsx`. The component uses a `TabBar` when in `CONFIG` mode, with current tabs: `CATEGORIAS`, `ABREVIACOES`, `MARKDOWN`.
- Examined `src/services/supabaseService.ts`. There is currently no method to fetch `pdm_ai_logs`.
- Examined `src/components/ui/DataTable.tsx`. The project has a solid robust `DataTable` component ready to be used.

## Logic Chain
1. **Database Service**: We need to add `getPdmAiLogs()` in `supabaseService.ts` to fetch from `pdm_ai_logs` filtering out `Aprovado`.
2. **UI Component**: We should create a new component `AiLogsView.tsx` within `src/components/RequestForm/PdmManual/` to encapsulate the logs table, keeping `index.tsx` clean.
3. **Tab Integration**: We must add `'LOGS_IA'` to the `configTab` state in `index.tsx` and register it in the `TabBar` component. When this tab is active, we render `<AiLogsView />`.
4. **Copy to Clipboard**: Inside `AiLogsView.tsx`, the `DataTable` column for `descricao_bruta` will render the text along with a `lucide-react` `Copy` button. Clicking it uses `navigator.clipboard.writeText` and triggers a `toast.success`.
5. **Prompt Update**: We must modify `compilePromptMarkdown` in `index.tsx` (lines 179-203):
   - Update step 6 of the instructions to specify returning four fields: `status`, `descricao_padronizada`, `message`, and `categoria_detectada`.
   - Update the "CATEGORIA DESCONHECIDA (FALLBACK)" block to explicitly mention `- categoria_detectada: null`.

## Caveats
- `pdm_ai_logs` is not mapped in `src/types/database.types.ts` natively, so we can type the data as `any[]` or create a local interface in `AiLogsView.tsx` (e.g., `id`, `created_at`, `status_retornado`, `descricao_bruta`, `mensagem_erro`).
- Make sure to use the "Solid/Blue Premium pattern" for buttons and layout as per the user's explicit rule. I added some class recommendations (`hover:bg-blue-50`, `text-blue-600`) to follow this.

## Conclusion
The implementation is ready to be executed.
1. Add `getPdmAiLogs` to `supabaseService.ts`.
2. Create `AiLogsView.tsx` with a `DataTable` rendering the fetched logs and the copy button.
3. Update `index.tsx` to include the new tab and render `AiLogsView`.
4. Update `compilePromptMarkdown` in `index.tsx` to require the `categoria_detectada` field.

## Verification Method
1. Open the application, log in as an Admin, and navigate to the PDM module.
2. Click "Configurar IA & PDM".
3. Verify the "Análise de IA" tab is present and displays logs.
4. Click the copy icon next to a raw description and verify the toast appears and the text is copied.
5. Check the "Prompt Markdown (IA)" tab to ensure the generated prompt correctly includes the `categoria_detectada` instruction.
