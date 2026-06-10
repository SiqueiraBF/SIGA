# Handoff Report

## 1. Observation
- In `src/components/pcm/PcmRequestModal.tsx` and `src/components/pcm/PcmConfirmModal.tsx`, the `handlePaste`, `handleDrop`, and file `<input>` handlers blindly accept all files into the `files` state without checking `file.size` or `file.type`.
- In `PcmRequestModal.tsx` (lines 65-73), when editing (`requestDataToEdit` is provided), it sets `setFiles([])` and completely ignores `requestDataToEdit.anexo_pcm_url`. The user cannot see existing attachments.
- In `PcmRequestModal.tsx` (line 114), `pcmService.updateRequest` is called with a `requestData` object that lacks any reference to the existing `anexo_pcm_url`.
- In `src/services/pcmService.ts` (lines 189-210), if new `files` are passed to `updateRequest`, the newly uploaded URLs are placed into an array, stringified, and set as `anexo_pcm_url`, completely discarding any previous URLs.
- In `pcmService.ts` (lines 212-218), if `anexo_pcm_url` evaluates to empty/falsy, it does not explicitly clear the value in the database, making it impossible to delete the last attachment.

## 2. Logic Chain
1. **Validation**: We must introduce a `validateFiles` helper in both modals to filter out files `> 10MB` or not matching `['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']`. Invalid files should trigger a `toast.error` and be excluded from the state.
2. **State Management**: `PcmRequestModal` needs a new state `existingUrls` to hold parsed URLs from `requestDataToEdit.anexo_pcm_url`. 
3. **UI Visibility**: `existingUrls` should be rendered alongside the new `files` array, giving users a way to preview them and a "Remover" button to delete them.
4. **Data Transmission**: On submit, `PcmRequestModal` must pass `anexo_pcm_url: JSON.stringify(existingUrls)` inside the `requestData` payload.
5. **Merging in Service**: `pcmService.updateRequest` must be modified. If new files are uploaded, it should parse the incoming `requestData.anexo_pcm_url` and concatenate it with the new URLs before stringifying.
6. **Deletion Fix**: In `updateRequest`, we must handle the case where `anexo_pcm_url` becomes `'[]'` or `''` by explicitly setting the field to `null` in the Supabase update query.

## 3. Caveats
- `PcmConfirmModal` currently only handles creating a confirmation (it doesn't have an edit mode), so it only needs the file size/type validation logic. 
- Existing URLs are strings, not `File` objects, so their preview logic in `PcmRequestModal` must handle string URLs, just like `PcmConfirmModal` already does (inferring type from the URL extension).

## 4. Conclusion
We must implement a `validateFiles` helper to prevent OOM errors from large files and fix the `updateRequest` pipeline to persist and properly merge or delete existing attachment URLs. 

## 5. Verification Method
1. Edit a request with an existing attachment; verify the attachment is listed in the UI.
2. Add a new file and remove the existing one; verify the database reflects only the new file.
3. Try dragging a 15MB file or a `.txt` file into the drop zone; verify that it is rejected with a `toast.error` and not added to the queue.
4. Verify the TypeScript compiler passes cleanly.
