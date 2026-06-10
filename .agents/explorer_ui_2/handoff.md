# Handoff Report: UI Global Modals & SavingFormModal Refactoring

## Observation
I have analyzed the project scope, user request, and the target files:
- `src/components/ui/Modal.tsx`: Currently uses `rounded-[24px]` for the main dialog wrapper.
- `src/components/ui/ModalHeader.tsx`: Currently lacks `eliteStyle` and `statusBadge` props. The title uses `text-lg font-bold` and the icon wrapper has standard padding and borders.
- `src/components/ui/ModalFooter.tsx`: Currently only accepts `children` and renders them aligned to the right via `flex-col-reverse sm:flex-row gap-3 justify-end`.
- `src/components/savings/SavingFormModal.tsx`: Currently uses the standard `ModalHeader` and `ModalFooter`. It implements its own simple file attachment input and uses standard `children` inside `ModalFooter`. The `FileUpload` global component exists at `src/components/ui/FileUpload.tsx` and requires `files` and `onFilesChange` props.

## Logic Chain
1. **Modal.tsx**: Modifying the base class to `rounded-2xl` aligns with the requested UI standard.
2. **ModalHeader.tsx**: Adding `eliteStyle?: boolean` and `statusBadge?: React.ReactNode` will support the new Elite standard. When `eliteStyle` is true, the icon wrapper will use `bg-slate-100 p-3 rounded-xl` to appear larger, and the title will change to `text-2xl font-extrabold`. The `statusBadge` will be conditionally rendered below the title.
3. **ModalFooter.tsx**: Adding `startActions?: React.ReactNode` and `endActions?: React.ReactNode` allows explicitly placing elements on the far left and right. Implementing a conditional render path (if either prop is passed) using `justify-between` and `w-full sm:w-auto` containers ensures the new layout works. If neither is passed, the component falls back to the legacy `justify-end` rendering of `children`, ensuring 100% backward compatibility.
4. **SavingFormModal.tsx**:
   - We will enable `eliteStyle` and add a `statusBadge` (e.g., indicating "Novo Registro" or "Edição de Registro" with a blue background pill).
   - The custom file input will be replaced entirely with the global `<FileUpload files={attachments} onFilesChange={setAttachments} />`, providing a much better drag-and-drop experience.
   - The Cancel button will be moved to `startActions` and the Save button to `endActions` in the `ModalFooter`, cleaning up the footer API usage.

## Caveats
- `ModalFooterProps` will need to have `children` marked as optional (`children?: React.ReactNode;`), since it may now just take `startActions` and `endActions`.
- The exact styling of the `statusBadge` in `SavingFormModal.tsx` wasn't strictly defined, so a standard badge using Tailwind classes (e.g., `px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-lg`) will be proposed.

## Conclusion
The refactoring strategy correctly isolates the global UI changes from the business logic. The `ModalFooter` maintains legacy compatibility by keeping the old flex-direction logic when the new props aren't provided. The `SavingFormModal` cleanly adopts the `FileUpload` and the new Elite Header/Footer props.

### Implementation Blueprint

1. **`src/components/ui/Modal.tsx`**:
   - Replace `rounded-[24px]` with `rounded-2xl`.

2. **`src/components/ui/ModalHeader.tsx`**:
   - Add `eliteStyle?: boolean` and `statusBadge?: React.ReactNode` to `ModalHeaderProps`.
   - Update `h2` classes: `${eliteStyle ? 'text-2xl font-extrabold' : 'text-lg font-bold'}`.
   - Update Icon wrapper classes: `className={eliteStyle ? \`p-3 rounded-xl bg-slate-100 border border-slate-200 shadow-sm ${iconClassName}\` : \`p-2 rounded-lg border border-slate-100 shadow-sm ${iconClassName}\`}`.
   - Render `{statusBadge && <div className="mt-1">{statusBadge}</div>}` below title.

3. **`src/components/ui/ModalFooter.tsx`**:
   - Update props to include `startActions` and `endActions`. Make `children` optional.
   - Return conditional layouts based on whether new props exist:
     ```tsx
     if (startActions || endActions) {
       return (
         <div className={\`px-6 py-4 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center \${!noBorder ? 'border-t border-slate-100' : ''} \${className}\`}>
           <div className="flex w-full sm:w-auto items-center gap-3 justify-start">{startActions}</div>
           <div className="flex w-full sm:w-auto items-center gap-3 justify-end">{endActions}{children}</div>
         </div>
       );
     }
     ```

4. **`src/components/savings/SavingFormModal.tsx`**:
   - Import `FileUpload`.
   - Pass `eliteStyle` and a `statusBadge` to `ModalHeader`.
   - Replace the entire attachments container content with `<FileUpload files={attachments} onFilesChange={setAttachments} />`.
   - Pass Cancel/Save buttons to `startActions` and `endActions` in `ModalFooter`.

## Verification Method
- **Static Analysis**: Run `npx tsc --noEmit` to ensure type compatibility of the new `ModalHeader` and `ModalFooter` props.
- **Visual Check**: Run the application in development mode (`npm run dev`), open the "Saving" creation modal, and confirm the larger icon, badge, drag-and-drop file upload, and distributed footer buttons.
- **Legacy Check**: Open another standard modal (e.g., `SupplierFormModal` if available) and ensure its footer remains correctly aligned to the right.
