# Handoff: PCM Attachments and File Upload Bugs Fix Strategy

## 1. Observation
- **Issue 1 (`pcmService.ts`)**: In `src/services/pcmService.ts`, lines 185-236, `updateRequest` processes `requestData.anexo_pcm_url` and `files`. It initializes `let combinedUrls: string[] = []`. If `requestData.anexo_pcm_url` is undefined, `combinedUrls` remains empty. Then it computes `const finalAnexoUrl = combinedUrls.length > 0 ? JSON.stringify(combinedUrls) : null;` and merges this unconditionally into the Supabase update payload:
  ```typescript
  .update({
    ...requestData,
    anexo_pcm_url: finalAnexoUrl
  })
  ```
  This causes `anexo_pcm_url` to be overwritten with `null` if the property is omitted from `requestData` and no new files are uploaded.

- **Issue 2 (`PcmRequestModal.tsx` & `PcmConfirmModal.tsx`)**: In `src/components/pcm/PcmRequestModal.tsx` (lines 395, 411) and `src/components/pcm/PcmConfirmModal.tsx` (lines 335, 350), the `<input type="file" />` elements have an `onChange` handler that filters and stores the selected files in the state. However, the handler does not reset the input value, which prevents the browser's `change` event from firing if the user removes a file and tries to select the exact same file again.

## 2. Logic Chain
- For Issue 1: By unconditionally adding `anexo_pcm_url: finalAnexoUrl` to the `.update` payload, the database's existing value is wiped out even when the caller didn't intend to modify attachments (i.e. by intentionally omitting `anexo_pcm_url` from the `requestData` object). To fix this, we should conditionally include `anexo_pcm_url` in the update payload only when `requestData` explicitly defines it OR when new `files` are being uploaded. If `files` are provided but `requestData.anexo_pcm_url` is `undefined`, we should fetch the existing URLs from the database to merge them correctly without data loss.
- For Issue 2: A file input's `onChange` event only fires when its internal `value` changes. When a user selects a file, it is loaded into `value`. If the file is removed from the state but the input's value remains unchanged, selecting the same file again will not trigger `onChange`. Clearing `e.target.value = ''` at the end of the `onChange` handler forces the browser to treat any subsequent selection (even of the same file) as a change.

## 3. Caveats
- I did not review all other file inputs across the entire application, as the scope explicitly requested focusing on the relevant modal components for PCM. These other components might suffer from the same issue and could be fixed if desired.
- For `updateRequest` in `pcmService.ts`, the proposed strategy fetches the current URLs from Supabase if new files are added without an explicit `requestData.anexo_pcm_url`. This guarantees no data loss but adds a `select` query overhead in this specific edge case.

## 4. Conclusion
We must implement two specific changes:
1. In `src/services/pcmService.ts:updateRequest`, construct the update payload dynamically. Only attach `anexo_pcm_url` to the payload if `requestData.anexo_pcm_url !== undefined` or `files?.length > 0`. If merging new files when `requestData.anexo_pcm_url` is omitted, fetch existing URLs from Supabase first.
2. In `src/components/pcm/PcmRequestModal.tsx` and `src/components/pcm/PcmConfirmModal.tsx`, append `e.target.value = '';` at the very end of the `onChange` functions for the `<input type="file" />` elements.

## 5. Verification Method
- **Issue 1**: Open the app, create a PCM Request with an attachment. Open the Edit modal, change only the "Priority" or "Machine", and save. Reload the page and ensure the original attachment is still there.
- **Issue 2**: Open the PCM Request or Confirm modal. Select a file (e.g., `image.png`), click "Remover" to remove it from the preview list. Click to upload again, select the exact same `image.png`. Verify that it appears in the list instead of doing nothing.
