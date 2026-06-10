# Handoff Report: Saving Form Modal Elite Refactor

## 1. Observation
- `src/components/ui/Modal.tsx` (Line 71): The main wrapper currently uses the `rounded-[24px]` class.
- `src/components/ui/ModalHeader.tsx`: The `ModalHeaderProps` interface only supports `title`, `subtitle`, `icon`, `onClose`, `className`, `iconClassName`, and `actions`. It lacks `eliteStyle` and `statusBadge`. The icon currently has `p-2 rounded-lg border border-slate-100 shadow-sm`. The title has `text-lg font-bold`.
- `src/components/ui/ModalFooter.tsx`: The `ModalFooterProps` interface only supports `children` (required), `className`, and `noBorder`. The wrapper div uses `justify-end`.
- `src/components/savings/SavingFormModal.tsx`:
  - The `ModalHeader` invocation does not use Elite Standard styling.
  - The `ModalFooter` has buttons passed as `children`, right-aligned.
  - The attachments section (Lines 322-367) uses a custom `<input type="file">` layout with manual rendering of files.
  - `src/components/ui/FileUpload.tsx` exists and provides a ready-to-use `<FileUpload files={...} onFilesChange={...} />` component.

## 2. Logic Chain
To fulfill the requirements (R1 and R2), the following changes are proposed:

**For R1 (Global UI Components):**
1. **`Modal.tsx`**: Change `rounded-[24px]` to `rounded-2xl` on the modal container div (Line 71).
2. **`ModalHeader.tsx`**:
   - Add `eliteStyle?: boolean` and `statusBadge?: React.ReactNode` to `ModalHeaderProps`.
   - Conditionally adjust the icon classes: if `eliteStyle` is true, use `p-3 rounded-xl bg-slate-100 text-slate-500 shadow-none border-none`; otherwise, keep the default.
   - Conditionally adjust the title classes: if `eliteStyle` is true, use `text-2xl font-extrabold`; otherwise keep `text-lg font-bold`.
   - Render `{statusBadge}` immediately below the title and subtitle.
3. **`ModalFooter.tsx`**:
   - Add `startActions?: React.ReactNode` and `endActions?: React.ReactNode` to `ModalFooterProps`, and make `children?: React.ReactNode` optional to prevent breaking legacy usages.
   - Conditionally adjust the wrapper: `const hasEliteActions = startActions || endActions;`. If `hasEliteActions` is true, change the container layout to `justify-between w-full` and render `startActions` in a left div and `endActions` in a right div. Otherwise, fallback to rendering `children` with `justify-end`.

**For R2 (SavingFormModal Refactoring):**
1. **Header Updates**: Pass `eliteStyle={true}` and `statusBadge={<StatusBadge status={initialData ? 'Edição' : 'Novo Registro'} variant="info" />}` to the `<ModalHeader>`. Include `import { StatusBadge } from '../ui/StatusBadge';`.
2. **Footer Updates**: Move the Cancel button into the `startActions` prop and the Save button into the `endActions` prop of `<ModalFooter>`. Remove them from `children`.
3. **FileUpload Integration**: 
   - Import `FileUpload` from `../ui/FileUpload`.
   - Replace the entire block of code handling custom attachments (from the label down to the file list mapping) with:
     ```tsx
     <FileUpload 
       files={attachments} 
       onFilesChange={setAttachments} 
       color="blue" 
     />
     ```
4. **Layout Check**: The form is mostly split into vertical blocks using `bg-white p-5 rounded-2xl`. Ensuring it stays clean and vertical will align with the PCM Elite standard. 

## 3. Caveats
- The legacy attachment input accepted `.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv`. The new `<FileUpload>` component (in `src/components/ui/FileUpload.tsx`) natively filters and only accepts PDF, PNG, JPG, and WebP, and limits sizes to 10MB. If other file types are strictly required, `FileUpload.tsx` might need a prop to allow custom formats, but per this scope, we use the standard `<FileUpload>` as it is.
- Making `children` optional in `ModalFooter.tsx` is safe, but we must be careful not to render an empty div if both legacy `children` and `startActions`/`endActions` are mixed up.

## 4. Conclusion
The implementation strategy confirms that by updating the interfaces and internal JSX logic of the three Global UI Modals, we can easily plug `SavingFormModal` into the Elite Standard. `FileUpload` handles all state bindings via `files` and `onFilesChange`, simplifying the file attachment logic significantly.

## 5. Verification Method
1. Run `npx tsc --noEmit` to verify that making `children` optional in `ModalFooter` and adding new props doesn't break existing modals.
2. Manually open the "Novo Registro de Saving" modal in the application and verify:
   - The title is larger with a grey icon background.
   - The status badge appears below the title.
   - The Cancel button is on the far left, and the Save button is on the far right.
   - The FileUpload component accepts files and correctly previews/adds them to the form state.
