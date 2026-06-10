# Challenger Report

**Status:** FAIL

## Observation
I reviewed the worker's implementation in `src/services/pcmService.ts` and the UI components (`src/components/pcm/PcmRequestModal.tsx` and `PcmConfirmModal.tsx`).
1. In `src/services/pcmService.ts`, the `updateRequest` method accepts `requestData: Partial<PcmRequest>`.
2. Inside `updateRequest`, `combinedUrls` is populated from `requestData.anexo_pcm_url`. If `requestData.anexo_pcm_url` is undefined, `combinedUrls` remains empty `[]`.
3. The method then processes any new `files`. If there are no new files, `combinedUrls` remains empty.
4. It sets `const finalAnexoUrl = combinedUrls.length > 0 ? JSON.stringify(combinedUrls) : null;`
5. The Supabase `.update` payload is constructed as `{ ...requestData, anexo_pcm_url: finalAnexoUrl }`.
6. In `PcmRequestModal.tsx` and `PcmConfirmModal.tsx`, the `<input type="file" onChange={...} />` handlers read `e.target.files` but do not clear the input's value (`e.target.value = ''`) after state is updated.

## Logic Chain
1. **Destructive Partial Update**: Because `updateRequest` accepts a `Partial<PcmRequest>`, a caller might invoke it to update only `obs_pcm` or `status` (e.g., `pcmService.updateRequest(id, { obs_pcm: "Update" })`). Since `anexo_pcm_url` is omitted from `requestData`, it is evaluated as `undefined`. Consequently, `finalAnexoUrl` becomes `null`, and the DB update explicitly overwrites `anexo_pcm_url` to `null`. This destructively deletes all existing attachments whenever a partial update omitting the attachments field occurs.
2. **File Input State Desync**: In the file input `onChange` handlers, because `e.target.value` is not cleared, the browser caches the chosen file path. If a user selects a file (e.g., `invoice.pdf`), clicks "Remover" in the UI to remove it from the React state, and then attempts to upload `invoice.pdf` again using the same input button, the `onChange` event will not fire. The user will be silently blocked from re-adding the file.

## Caveats
- The destructive update bug in `pcmService.updateRequest` is currently not triggered by the `PcmRequestModal.tsx` UI because the UI component intentionally passes `anexo_pcm_url: JSON.stringify(existingUrls)` on every edit. However, a service layer method accepting `Partial<T>` must be safe for arbitrary partial updates. Leaving this bug exposes the system to catastrophic data loss in future integrations.
- The 10MB validation logic correctly parses file size and matches against MIME types, passing my static verification.

## Conclusion
The implementation FAILS verification due to a severe data destruction flaw in the service layer's partial update logic and a frustrating UX bug in the file upload inputs. 

**Required Fixes:**
1. In `src/services/pcmService.ts` -> `updateRequest`, only include `anexo_pcm_url` in the Supabase update payload if it was actually provided in `requestData` or if new `files` were uploaded.
2. In `PcmRequestModal.tsx` and `PcmConfirmModal.tsx`, add `e.target.value = '';` at the end of the `onChange` event handlers for all `<input type="file" />` elements.

## Verification Method
- Execute the `test-update.js` script in my working directory which simulates the `updateRequest` logic. It clearly logs the `anexo_pcm_url: null` override when given a mock payload without the URL field.
- Manually run the web application, add a file, click remove, and try to add the exact same file again via the "Adicionar mais arquivos" button to witness the failure to trigger.
