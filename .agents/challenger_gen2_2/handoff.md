# Challenge Report: Iteration 2 Bug Fixes

## 1. Observation
- In `src/services/savingService.ts`, the `update` method correctly targets the `savings_attachments` bucket. When executing `supabase.storage.from('savings_attachments').remove(pathsToRemove)`, any `storageError` is logged via `console.error` and is not thrown.
- In `src/components/savings/SavingFormModal.tsx`, `existingAttachments` is maintained as `{name, path, url}[]` and converted to `{name, path}[]` when passed to `savingService.update`.
- In `src/components/savings/SavingFormModal.tsx`, the `valor_inicial` and `valor_final` inputs are defined as `<input type="number" step="0.01" />`.
- In the submit handler of `SavingFormModal.tsx` (lines 130-131), the values are parsed using `.replace(/\./g, '').replace(',', '.')`.

## 2. Logic Chain

### FileUpload & Deletion Integration (Pass with Caveats)
- The modal accurately reconstructs the `existingAttachments` state. When users delete an attachment, `handleExistingUrlsChange` filters it out.
- The correct format (`{name, path}[]`) is sent to the backend, avoiding JSONB bloat with signed URLs.
- The `savingService.update` deletion logic successfully prevents unhandled exceptions if the file isn't found in the bucket.
- **Caveat (Storage Leak)**: Because `finalAnexos = existingAnexos;` is executed regardless of whether the storage deletion succeeded, a failed bucket deletion (due to network timeout, missing file, etc.) will still remove the file reference from the database. This leaves an orphaned file in the storage bucket. While this prioritizes UI resilience over storage cleanliness, it is an accepted trade-off.

### Financial Value Parsing (Critical Failure)
- HTML5 `<input type="number" />` elements always return their `.value` as a standard float string (e.g., `"1000.50"`), strictly adhering to the en-US format regardless of the user's locale. They never return commas or thousands separators.
- The parsing logic applies `.replace(/\./g, '')` to this float string.
- As a result, the decimal point is completely stripped out (`"1000.50"` becomes `"100050"`). The subsequent `.replace(',', '.')` does nothing because there is no comma.
- `Number("100050")` parses to `100050`, meaning the user's input is multiplied by 100 (or 10 if there's 1 decimal place). 
- This leads to catastrophic corruption of the `valor_inicial` and `valor_final` values saved in the database.

## 3. Caveats
- The storage leak issue during a failed Supabase removal might be an intentional design choice to prevent the UI from blocking the user if a file is already manually deleted or the bucket goes out of sync. 
- The `type="number"` parsing bug assumes that no external library (like a masked input handler) is overriding the native behavior of `e.target.value`. Based on the raw HTML tag used in `SavingFormModal`, native behavior applies.

## 4. Conclusion
- **Overall Risk Assessment**: CRITICAL
- The **Supabase deletion integration** and **FileUpload state management** are functioning as requested, passing the correct formats and avoiding unhandled exceptions. 
- However, the **financial value parsing logic** is fundamentally incompatible with the `<input type="number" />` field, leading to severe data corruption when saving or editing records. The `.replace` formatting logic should only be used on `type="text"` fields.

## 5. Verification Method
- **Supabase Deletion**: To verify, comment out the storage `.remove` logic or mock a failure. Ensure the DB `savings` record updates successfully without throwing an error in the UI.
- **Value Parsing Bug**: Run the project, open the "Novo Registro de Saving" modal, and type `1000.50` into the "Valor Inicial" field. The UI will instantly show the "Valores e Cálculo de Saving" preview as calculating with `100050`, and submitting the form will save the corrupted, inflated value to the backend.
