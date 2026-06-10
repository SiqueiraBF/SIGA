# Handoff Report: SavingFormModal Bug Fixes

## 1. Observation
- **Currency Parsing Bug**: In `src/components/savings/SavingFormModal.tsx` (lines 113-114 and 156-157), the code uses `Number(formData.valor_inicial.replace(',', '.'))` to parse currency strings. If a user inputs a number with a thousands separator (e.g., `1.234,56`), the resulting string `1.234.56` evaluates to `NaN`.
- **FileUpload Logic Bug**: The component renders `<FileUpload files={attachments} onFilesChange={setAttachments} compact />` (line 335), omitting the `existingUrls` and `onExistingUrlsChange` props. Furthermore, `savingService.update` (`src/services/savingService.ts`, line 78) merely appends new files to the existing ones and offers no mechanism to specify which existing files to keep or remove.
- **Dead Code**: The functions `handleFileChange` and `removeAttachment` (lines 91-100) are defined but never called, as the new `FileUpload` component invokes `setAttachments` directly.

## 2. Logic Chain
1. **Fix Currency Parsing**: 
   - We must remove all period characters before replacing the comma with a period. 
   - A utility helper `const parseCurrency = (val: string) => Number(val.replace(/\./g, '').replace(',', '.') || 0);` should replace the existing inline parsing to ensure `1.234,56` parses correctly into `1234.56`. This applies to both the `handleSubmit` logic and the real-time preview calculation.
2. **Fix FileUpload & Service Logic**:
   - In `SavingFormModal.tsx`, introduce a state `const [existingAttachments, setExistingAttachments] = useState<{name: string, path: string, url: string}[]>([]);`.
   - During the `initialData` `useEffect`, asynchronously iterate over `initialData.anexos`, fetch their signed URLs using `savingService.getAttachmentUrl()`, and store the results in `existingAttachments`.
   - Update the `FileUpload` invocation to include:
     - `existingUrls={existingAttachments.map(a => a.url)}`
     - `onExistingUrlsChange={(urls) => setExistingAttachments(prev => prev.filter(a => urls.includes(a.url)))}`
   - In `src/services/savingService.ts`, modify `update` to accept a 4th optional parameter: `existingAnexos?: {name: string, path: string}[]`.
   - Inside the service's `update`, if `existingAnexos` is provided, calculate the deleted files, remove them from the Supabase storage bucket (`savings_attachments`), and assign `anexos = existingAnexos` before pushing new files.
   - Finally, pass `existingAttachments.map(a => ({ name: a.name, path: a.path }))` to `savingService.update` inside `handleSubmit`.
3. **Remove Dead Code**:
   - Delete `handleFileChange` and `removeAttachment` functions to tidy up `SavingFormModal.tsx`.

## 3. Caveats
- Modifying `savingService.update` alters its signature. By making the `existingAnexos` parameter optional, it remains backwards compatible, but other areas using this service won't automatically benefit from the file deletion functionality unless updated.
- We rely on `url` strings provided by `FileUpload`'s `onExistingUrlsChange` to identify which specific attachments were preserved, which relies on the strict 1:1 mapping between `existingAttachments` and `existingUrls`.

## 4. Conclusion
The implementation strategy comprehensively addresses the currency formatting crashes, enables users to visualize and manage previously uploaded attachments within the modal, and cleans up dead code. The strategy requires coordinated edits between `SavingFormModal.tsx` and `savingService.ts`.

## 5. Verification Method
- **Currency**: Open the form, input "1.500,00" into "Valor Inicial" and "1.300,50" into "Valor Final". Verify the UI calculates and displays a saving of `199.50`.
- **FileUpload**: Open an existing record that possesses attachments. Confirm that the attachments load correctly in the `FileUpload` UI. Click "Remover" on one of them, upload a new file, and save. Check the backend (Supabase) to confirm the removed file was deleted and the new file was added.
- **Dead Code**: Ensure `SavingFormModal.tsx` has no leftover references to `handleFileChange`.
