# Handoff Report

## 1. Observation
- `PcmRequestModal.tsx` (lines 32-57, 334, 344) and `PcmConfirmModal.tsx` (lines 29-54, 312, 322) handle file inputs (`onChange`, `onPaste`, `onDrop`) by blindly using `Array.from(files)` without checking `.size` or `.type`. The UI explicitly claims "PDF, PNG, JPG até 10MB" but the code does not enforce it.
- In `pcmService.ts`, the `updateRequest` function (lines 189-210) completely overwrites the `anexo_pcm_url` field if new files are passed, ignoring any existing URLs.
- In `PcmRequestModal.tsx`, when opened in edit mode (`requestDataToEdit` is provided), it clears the files state: `setFiles([])` (line 71), completely hiding any existing attachments from the user. Because the `requestData` payload sent to `updateRequest` does not currently include `anexo_pcm_url`, old attachments remain in DB if no new files are uploaded, but are wiped if new ones are uploaded.

## 2. Logic Chain
1. Without client-side size validation, large files (e.g., 500MB videos) are accepted into the React `files` array state.
2. When submitting, `pcmService.createRequest` or `updateRequest` calls a Supabase Edge Function to send an email, mapping over the `files` array and calling `fileToBase64`. This loads the entire file into memory as a base64 string, causing OOM (Out of Memory) crashes for massive files.
3. When editing, the modal doesn't parse and display the existing URLs (stored as a JSON string in `requestDataToEdit.anexo_pcm_url`). Thus, the user has no visibility or control over them.
4. When `updateRequest` is called with new files, it generates a new JSON array of URLs and strictly assigns it to `anexo_pcm_url`, permanently dropping the references to previous attachments.

## 3. Caveats
- `PcmConfirmModal.tsx` has the same lack of file validation as `PcmRequestModal.tsx` and must also be updated.
- When parsing `anexo_pcm_url`, we must handle both legacy single strings and modern JSON arrays gracefully.
- If a user removes all existing attachments and uploads no new ones, `anexo_pcm_url` must be explicitly set to `null` in the Supabase `.update()` call. Currently, the update logic in `pcmService.ts` uses `...(anexo_pcm_url && { anexo_pcm_url })`, which would ignore a `null` or `undefined` value, leaving the old URLs in the database.

## 4. Conclusion
To fix this, the implementer needs to:
1. **Client-Side Validation:** Create a `validateFiles` helper in both `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` to reject files > 10MB or of invalid types (non PDF/PNG/JPG). Apply this helper inside the `onChange`, `onDrop`, and `onPaste` handlers before adding to state.
2. **Display Existing Attachments:** Add an `existingAttachments` state (array of strings) to `PcmRequestModal.tsx` to parse and display URLs from `requestDataToEdit.anexo_pcm_url`.
3. **Manage Existing Attachments:** Render these `existingAttachments` in the UI alongside the newly uploaded `files`, and provide a button to remove them from the state.
4. **Send State to Service:** Update the `requestData` payload in `handleSubmit` of `PcmRequestModal` to include `anexo_pcm_url: existingAttachments.length > 0 ? JSON.stringify(existingAttachments) : null`.
5. **Service Refactor:** Refactor `updateRequest` in `pcmService.ts` to merge `requestData.anexo_pcm_url` (which now represents the user-retained existing attachments) with the newly uploaded file URLs. Ensure that the Supabase `.update()` call explicitly includes `anexo_pcm_url` even if it is `null`.

## 5. Verification Method
1. **Validation Test:** Try uploading a > 10MB file or a video file — it should show a toast error and not add it to the preview list.
2. **Edit Test:** Edit an existing request that has attachments — the attachments should appear in the UI.
3. **Append Test:** Append a new attachment during edit and save. Verify the database record has both the old URL and the new URL in the `anexo_pcm_url` JSON array.
4. **Delete Test:** Edit an existing request, delete all attachments, and save. Verify `anexo_pcm_url` is `null` in the database.
