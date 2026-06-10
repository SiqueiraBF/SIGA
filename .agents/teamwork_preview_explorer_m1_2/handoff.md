# Handoff Report: Milestone 1 - Lead Time & Multiple Attachments

## Observation
- **`PcmRequests.tsx` (Table)**: Currently missing a "Lead Time" column. Table has headers up to `Data SC` and `Ações` (lines 405-414).
- **`PcmRequestModal.tsx` and `PcmConfirmModal.tsx`**: Uses `const [file, setFile] = useState<File | null>(null);` and an `<input type="file" />` without the `multiple` attribute. Drop and paste events replace the existing file.
- **`pcmService.ts`**: `createRequest`, `updateRequest`, and `confirmRequest` accept a single `file?: File`. Uploads a single file, gets a `publicUrl`, and stores it in `anexo_pcm_url` / `anexo_almox_url`. Email dispatch uses the single file for the `attachments` array.
- **`PcmDetailsModal.tsx` & `PcmConfirmModal.tsx`**: Assumes `request.anexo_pcm_url` and `request.anexo_almox_url` are single string URLs, rendering one button to view the document.

## Logic Chain
1. **Lead Time in `PcmRequests.tsx`**:
   - Add a "Lead Time" header.
   - Add a cell calculating the difference in hours and minutes (`XXh YYm`) between `created_at` and `data_confirmacao`. If `status` is not `COMPLETED` or `data_confirmacao` is null, render `-`.
2. **Multiple Files selection (Modals)**:
   - Change state from `file` (`File | null`) to `files` (`File[]`).
   - Add the `multiple` attribute to the `<input type="file" />`.
   - Update `handleDrop` and `handlePaste` to append multiple files (e.g., `setFiles(prev => [...prev, ...newFiles])`).
   - Render a list of selected files with a `Remover` button for each specific file index.
3. **Multiple Files Storage (`pcmService.ts`)**:
   - Change `file?: File` parameter to `files?: File[]`.
   - Iterate through the `files` array to upload each to Supabase Storage (`pcm-anexos` bucket). Ensure generated filenames are unique (e.g., adding an index or unique hash).
   - Collect the generated `publicUrl`s. If the array is not empty, `JSON.stringify` it to save in the string column (`anexo_pcm_url` / `anexo_almox_url`), preserving DB schema.
   - Update the `send-email` invocation to map over the `files` array with `await Promise.all()` to generate multiple attachments.
4. **Rendering Attachments (`PcmDetailsModal.tsx` & `PcmConfirmModal.tsx`)**:
   - Create a helper to parse the URL string backward-compatibly:
     ```javascript
     const parseUrls = (urlStr) => {
       if (!urlStr) return [];
       if (urlStr.startsWith('[')) {
         try { return JSON.parse(urlStr); } catch { return [urlStr]; }
       }
       return [urlStr];
     };
     ```
   - Render a list of buttons, one for each parsed URL.

## Caveats
- Using `Promise.all` for uploads is faster but can hit connection limits if many large files are uploaded. Sequential uploading might be safer if files are large.
- When generating filenames for Storage, doing `Date.now()` concurrently in a loop might yield the same timestamp. Combine `Date.now()` with a random string and the index.
- Backward compatibility relies on checking if the string starts with `[`. Existing single URLs won't start with `[` (since they are `https://...`).

## Conclusion
The implementation requires adding the calculated Lead Time column to `PcmRequests.tsx`. For attachments, `pcmService` needs to be refactored to iterate and upload multiple files, storing them as a JSONified string. Modals must update their file state to arrays, allow multiple file uploads, and use a robust parsing utility to render both legacy single URLs and new array strings.

## Verification Method
1. Open the SIGA app and navigate to PCM Requests.
2. Create a new PCM Request and attach at least 2 files. Verify the UI lists both files with removal options. Submit.
3. In `PcmRequests.tsx`, observe the new request. "Lead Time" should display `-`.
4. Open the Request in Almoxarifado confirmation mode (`PcmConfirmModal`). Attach 2 new files and confirm.
5. In `PcmRequests.tsx`, verify "Lead Time" now displays the elapsed time correctly (e.g., `0h 1m`).
6. Open `PcmDetailsModal` for the request. Verify you can click and view all original attachments and all SC attachments.
7. Open a legacy request (created before this change) and verify its single attachment button still works perfectly.
