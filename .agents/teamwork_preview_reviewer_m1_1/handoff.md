# Review Report - PCM Lead Time & Attachments

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Major] Finding 1: Missing File Validation
- **What**: The UI states "PDF, PNG, JPG até 10MB" but the file input (`onChange`), paste (`onPaste`), and drag-and-drop (`onDrop`) handlers do not validate the file size or type.
- **Where**: `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` (state updates for `files`).
- **Why**: Allowing any file size will cause the browser to crash when converting large files to Base64 in memory (in `pcmService.fileToBase64`), or exceed email/Supabase API limits.
- **Suggestion**: Add a check to filter out files > 10MB and invalid MIME types before adding them to the `files` state. Display a toast error if a file is rejected. Example: `file.size <= 10 * 1024 * 1024`.

### [Major] Finding 2: Existing Attachments are Hidden and Silently Overwritten
- **What**: When editing an existing request, `PcmRequestModal.tsx` initializes `files` to `[]` and does not display previously uploaded files. Furthermore, if new files are selected, they completely overwrite the existing attachments.
- **Where**: `PcmRequestModal.tsx` (lines 65-73) and `pcmService.ts` (`updateRequest`).
- **Why**: The user has no visibility into what files are already attached. Uploading a new file deletes all existing files without any warning, leading to potential data loss.
- **Suggestion**: At a minimum, add a warning label when editing a request that has existing files (e.g., "Atenção: Enviar novos arquivos substituirá os anexos existentes"). Better yet, display the existing attachments in read-only mode so the user knows they exist.

### [Minor] Finding 3: Lack of `accept` attribute on file inputs
- **What**: The `<input type="file" />` elements lack the `accept` attribute.
- **Where**: `PcmRequestModal.tsx` and `PcmConfirmModal.tsx`.
- **Why**: Providing the `accept` attribute (e.g., `accept=".pdf,.png,.jpg,.jpeg"`) provides a better native OS file picker experience by filtering out invalid files early.
- **Suggestion**: Add `accept=".pdf,image/png,image/jpeg"` to the file inputs.

## Verified Claims
- `PcmRequests.tsx` correctly displays the Lead Time column and computes the duration accurately -> verified via code inspection -> PASS
- `PcmDetailsModal.tsx` correctly supports multiple URLs and has backwards compatibility for legacy string formats -> verified via code inspection -> PASS
- `pcmService.ts` correctly saves arrays of URLs as JSON strings -> verified via code inspection -> PASS

## Stress Test & Adversarial Review
- **Assumption challenged**: Users will only upload small image or PDF files.
- **Attack scenario**: A user selects a 500MB ISO or video file via the file picker.
- **Blast radius**: The application calls `pcmService.createRequest`, which calls `fileToBase64`. The `FileReader` attempts to load 500MB into memory, causing the browser tab to hang or crash (Out of Memory).
- **Mitigation**: Implement strict file size validation (<= 10MB) on the client side before appending to the `files` state.

## Conclusion
The implementation of the Lead Time metric and the JSON mapping of multiple attachments is robust. However, the file upload components critically lack size and type validation, presenting a high risk of application crashes via `fileToBase64` OOM. Please implement the validations to proceed.
