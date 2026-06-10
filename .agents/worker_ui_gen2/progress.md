# Progress

Last visited: 2026-06-06T02:37:00Z

- Implemented twMerge for `Modal.tsx`, `ModalHeader.tsx`, and `ModalFooter.tsx`.
- Solved scroll leak with module-scoped `openModalsCount` in `Modal.tsx`.
- Refactored `ModalFooter.tsx` layout structure to keep children aligned with `endActions`.
- Added support for fetching and maintaining existing attachments state within `SavingFormModal.tsx` and correctly submitting them.
- Updated `savingService.ts`'s `update` routine to compute diffs against `existingAnexos` and purge unlisted objects from Supabase Storage.
- Cleaned up obsolete handlers `handleFileChange` and `removeAttachment` in `SavingFormModal.tsx`.
- Adjusted string manipulation in `SavingFormModal.tsx` for parsing BRL currency structures correctly.
- Confirmed correct types using `npx tsc --noEmit`.
