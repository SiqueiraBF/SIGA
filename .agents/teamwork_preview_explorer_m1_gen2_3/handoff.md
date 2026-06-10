# Handoff Report

## Observation
1. In `src/components/pcm/PcmRequestModal.tsx` and `src/components/pcm/PcmConfirmModal.tsx`, file uploads are handled in `handlePaste`, `handleDrop`, and the `<input type="file" />` `onChange` events. In all these cases, `File` objects are added to the `files` state directly (e.g., `setFiles(prev => [...prev, ...Array.from(e.target.files)])`) without any checks for file size (`file.size <= 10 * 1024 * 1024`) or file type. This allows massive files to crash the app when `fileToBase64` runs.
2. In `src/components/pcm/PcmRequestModal.tsx`, when editing an existing request (`requestDataToEdit`), the modal sets `setFiles([])` but completely ignores `requestDataToEdit.anexo_pcm_url`. Thus, existing attachments are hidden from the UI.
3. In `src/services/pcmService.ts`, the `updateRequest` method overwrites the entire `anexo_pcm_url` field with newly uploaded files if `files && files.length > 0` is true. It fails to preserve existing URLs:
   ```typescript
   let anexo_pcm_url = requestData.anexo_pcm_url;
   if (files && files.length > 0) {
      const urls: string[] = [];
      // uploads new files and pushes to urls
      anexo_pcm_url = JSON.stringify(urls); // overwrites!
   }
   ```

## Logic Chain
1. To prevent OOM crashes, we must introduce file validation. A unified `processFiles` helper should be created in both `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` to filter out files > 10MB and unsupported types, raising a `toast.error` for invalid files, and only adding valid ones to state.
2. To stop silently overwriting existing attachments, `PcmRequestModal` must load them. We need an `existingUrls` state initialized from `requestDataToEdit.anexo_pcm_url`. The UI should render these existing attachments alongside new files, and provide a "Remover" button that filters them out of `existingUrls`.
3. When saving the edit, `PcmRequestModal` must pass the updated `existingUrls` list back to `pcmService.updateRequest`: `requestData.anexo_pcm_url = JSON.stringify(existingUrls)`.
4. Finally, `pcmService.updateRequest` must be modified to append new file URLs to the incoming `requestData.anexo_pcm_url` rather than replacing it entirely, and ensure it correctly handles saving when all files are removed.

## Caveats
- `PcmConfirmModal.tsx` does not have an "edit mode" for confirmations yet, so it only needs the validation logic, not the `existingUrls` logic.
- We assume `requestDataToEdit.anexo_pcm_url` might be a single string or a JSON array of strings based on legacy vs new data formats. The parsing logic should handle both (using `try/catch` with `JSON.parse`).

## Conclusion
A multi-file edit is required across three files (`pcmService.ts`, `PcmRequestModal.tsx`, and `PcmConfirmModal.tsx`) to validate file sizes/types and properly display, append, and remove existing attachments during an edit.

## Verification Method
- Open the application and try uploading a 15MB file or an `.exe` file in both the PCM Request creation and Almoxarifado confirmation modals. Expect a toast error.
- Create a request with an attachment. Then edit that same request. Expect the existing attachment to show up in the UI. Add a new attachment and save. Verify in the database (or by re-editing) that both attachments are preserved.
- Edit the request again, remove one of the attachments, save. Verify the removal persisted.
