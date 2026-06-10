# Handoff Report: Milestone 1 - Lead Time and Multiple Attachments

## Observation
1. **`src/pages/PcmRequests.tsx`**: Currently missing a "LEAD TIME" column. The table headers do not have it, and the rows only show "Data" and "Data SC".
2. **`src/components/pcm/PcmRequestModal.tsx` & `src/components/pcm/PcmConfirmModal.tsx`**: They use `const [file, setFile] = useState<File | null>(null);` limiting selection to a single file. The `<input type="file">` lacks the `multiple` attribute.
3. **`src/services/pcmService.ts`**: The `createRequest`, `updateRequest`, and `confirmRequest` methods expect a single `file?: File`. They perform a single upload and save the string URL to `anexo_pcm_url` or `anexo_almox_url`. Email generation uses a single attachment array element.
4. **`src/components/pcm/PcmDetailsModal.tsx`**: Displays a single button for `request.anexo_pcm_url` and `request.anexo_almox_url` (lines 90-103, 172-188).
5. **`src/components/pcm/PcmConfirmModal.tsx`**: Also displays the original PCM attachment as a single file (lines 177-191).

## Logic Chain
1. To add the "LEAD TIME" column, `PcmRequests.tsx` needs a new table header. The body row will use `differenceInMinutes` from `date-fns` (comparing `req.data_confirmacao` and `req.created_at`). If `status === 'COMPLETED'` and `data_confirmacao` exists, format as "XXh YYm", otherwise display "-".
2. To support multiple file selection, the state in modals (`PcmRequestModal.tsx`, `PcmConfirmModal.tsx`) needs to be `const [files, setFiles] = useState<File[]>([]);`. Drop handlers and paste handlers must append to this array. The file input needs the `multiple` attribute. The UI must map over the `files` array to show names and a "Remover" button for each.
3. For multiple uploads, `pcmService.ts` must accept `files?: File[]`. It must map over `files` to upload each, collect the public URLs, and store them as a JSON string (`JSON.stringify(urls)`) into `anexo_pcm_url` / `anexo_almox_url`. The email sending logic must use `Promise.all(files.map(...))` to attach all files.
4. To ensure backward compatibility, `PcmDetailsModal.tsx` and `PcmConfirmModal.tsx` need a helper function to parse the attachment strings. The helper will attempt `JSON.parse`. If it fails, it treats the string as a single URL (the old format). The UI will then iterate over the array of URLs to render multiple "Visualizar Anexo" buttons.

## Caveats
- When editing a request in `PcmRequestModal.tsx`, existing attachments are currently not pre-loaded into the file state (the code clears the state). Modifying this logic to load existing files as `File` objects from URLs is complex. The standard behavior of overwriting if new files are provided can be maintained, or just sending new files to append. For this milestone, we maintain the existing behavior: selecting new files will overwrite or append depending on how `updateRequest` is structured, but we store the new JSON array.
- For previewing multiple files, the `previewUrl` state remains a single string. When clicking a specific file's "Visualizar" button, the modal will set that specific URL to `previewUrl`.

## Conclusion
A full implementation plan requires:
1. Update `PcmRequests.tsx` to include the Lead Time column calculation.
2. Update `pcmService.ts` to accept `File[]`, upload iteratively, and stringify the resulting array of URLs. Add `Promise.all` for email attachments.
3. Update `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` to manage an array of `File` objects, updating drag-and-drop, paste, input handlers, and the rendering of the selected files list.
4. Update `PcmDetailsModal.tsx` and the sidebar of `PcmConfirmModal.tsx` to parse the `anexo_*_url` properties safely (falling back to array wrapper on JSON parse error) and map over them to render multiple attachment buttons.

## Verification Method
- **Lead Time**: Check the PCM requests table. Completed requests should show "XXh YYm". Pending/canceled should show "-".
- **Multiple Files**: Open "Nova Solicitação", select multiple files. Ensure all file names appear with remove buttons.
- **Upload & Storage**: Submit the request, verify in the Supabase DB that `anexo_pcm_url` contains a JSON string like `["url1", "url2"]`.
- **Details Rendering**: Open the details of the created request and verify multiple buttons appear. Open an older request with a plain string URL and verify a single button appears without crashing.
