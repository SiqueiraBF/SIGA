# Handoff: Saving Form Modal Elite Refactor

## Observation
1. **`src/components/ui/Modal.tsx`**: Line 71 uses `rounded-[24px]`. The target is `rounded-2xl` for the modal container.
2. **`src/components/ui/ModalHeader.tsx`**: Currently lacks `eliteStyle` and `statusBadge` props. The icon rendering uses `p-2 rounded-lg border border-slate-100 shadow-sm` and title is `text-lg font-bold`.
3. **`src/components/ui/ModalFooter.tsx`**: Uses `justify-end` to align children to the right. Does not support split actions (`startActions` and `endActions`).
4. **`src/components/savings/SavingFormModal.tsx`**: Manually implements a file input structure (lines 329-366) instead of utilizing the robust `<FileUpload />` component. The footer manually aligns the "Cancelar" and "Salvar" buttons within `ModalFooter`'s children.
5. **`src/components/ui/FileUpload.tsx`**: This component is present in the codebase and natively handles file drag-and-drop, valid format checking, and arrays of `File` objects.

## Logic Chain
1. To upgrade `Modal.tsx` to the Elite Standard, changing `rounded-[24px]` to `rounded-2xl` strictly follows the visual directive (R1) for the base modal.
2. In `ModalHeader.tsx`, we must expand the `ModalHeaderProps` interface with `eliteStyle?: boolean` and `statusBadge?: React.ReactNode`. If `eliteStyle` is true, the icon wrapper will receive `p-3 rounded-xl bg-slate-100` (increasing size and applying a grey background). The title class should switch to `text-2xl font-extrabold`. The `statusBadge` can be rendered directly under the title container.
3. In `ModalFooter.tsx`, adding `startActions` and `endActions` to `ModalFooterProps` allows splitting the footer content. If either of these props is provided, the flex container should use `justify-between` while placing `startActions` on the left and `endActions` alongside any `children` on the right. If neither is provided, it falls back to the legacy `justify-end` rendering.
4. For `SavingFormModal.tsx`:
   - Import and instantiate `<FileUpload files={attachments} onFilesChange={setAttachments} color="blue" />` to fully replace the manual input HTML, matching the PCM visual layout.
   - Update `<ModalHeader>` with `eliteStyle` and a `statusBadge` (e.g., a pill indicating "Novo Registro" or "Edição") to fulfill R2.
   - Move the footer buttons to the new `startActions` (Cancelar) and `endActions` (Salvar) props of `<ModalFooter>`, leaving `children` empty.

## Caveats
- The legacy behavior of `ModalFooter` relies on flex-row flow; the conditional wrapper used to support `startActions` must maintain responsive classes (`w-full sm:w-auto`) to avoid breaking modal displays on mobile screens.
- `SavingFormModal` file states currently use raw `File[]`. The `FileUpload` integration assumes that no existing uploaded URLs will be presented initially unless `initialData` gets updated to include them. The current strategy aligns with the existing file management logic.

## Conclusion
The UI elements `Modal`, `ModalHeader`, and `ModalFooter` require structural additions that are backwards-compatible and non-breaking for existing features. `SavingFormModal` can seamlessly consume these new global component capabilities along with `FileUpload` to achieve the Elite Standard. The implementer should apply the modifications outlined in the logic chain to fulfill all requirements.

## Verification Method
1. **Type Check**: Run `npx tsc --noEmit` from the root directory to confirm `ModalHeaderProps` and `ModalFooterProps` type compliance.
2. **Visual Inspection**: Open the system and trigger the Saving Form Modal. Validate that:
   - The modal has `rounded-2xl` corners.
   - The header displays a larger, bolded text (`2xl font-extrabold`) and a grey-background icon.
   - The `FileUpload` component appears in the "Anexos" section and handles interactions.
   - The footer perfectly divides actions: "Cancelar" strictly on the left, "Salvar" strictly on the right.
