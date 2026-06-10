# Handoff Report

## Observation
1. In `src/components/StockRequestForm.tsx`, `<ConfirmDialog ... />` is instantiated without an `isLoading` prop, even though a local `loading` state is actively managed during confirmation actions.
2. In `src/pages/StockRequestList.tsx`, `<ConfirmDialog ... />` is also instantiated without an `isLoading` prop, and there is no dedicated state tracking the deletion progress specifically for the dialog.
3. In `src/components/StockRequestForm.tsx` within `handleSubmit` and `handleDelete`, the `onConfirm` callback synchronously calls `onClose()` inside a `try` block. This function unmounts the form component. Following this, the `finally` block executes `setLoading(false)` on the unmounted component.
4. Additionally, `src/components/ui/ConfirmDialog.tsx` contains `await onConfirm(); onClose();`. This means the dialog itself attempts to close and update parent state (`setConfirmDialog`) after `onConfirm` resolves, which fails if the parent form was already unmounted.

## Logic Chain
1. **Double Submit Bug**: Because `isLoading` is not passed to the `<ConfirmDialog />` instances, the "Confirm" button inside the modal is never disabled and does not show a loading spinner. This leaves the button active during the asynchronous `onConfirm` execution, allowing multiple clicks.
2. **React Unmount Leak**: In `StockRequestForm.tsx`, when `handleSubmit` or `handleDelete` triggers `onConfirm`, it calls `onClose()` upon success. This immediately unmounts the `StockRequestForm` component.
3. After `onClose()` unmounts the form, the `finally { setLoading(false) }` block executes, causing a React state update warning on the unmounted component.
4. Furthermore, `ConfirmDialog.tsx` resumes execution after `await onConfirm()` and calls its own `onClose()`. This attempts to update the `confirmDialog` state on the already unmounted `StockRequestForm` component, triggering an additional warning.

## Caveats
- Adding an `isDeleting` state to `StockRequestList.tsx` isolates the loading state for the modal perfectly, but care should be taken not to trigger global data fetching spinners simultaneously unless intended.
- The use of `setTimeout` to defer `onClose()` is a pragmatic solution that guarantees call stacks clear before unmounting, without requiring structural changes to how `ConfirmDialog` manages its lifecycle.

## Conclusion
**Strategy to Fix Double Submit Bug**:
- In `src/components/StockRequestForm.tsx`: Pass the existing `loading` state to `<ConfirmDialog ... isLoading={loading} />`.
- In `src/pages/StockRequestList.tsx`: Introduce a new `const [isDeleting, setIsDeleting] = useState(false);` state. Set it to `true`/`false` inside `handleDelete`'s `onConfirm` logic, and pass it to `<ConfirmDialog ... isLoading={isDeleting} />`.

**Strategy to Fix React Unmount Leak (`src/components/StockRequestForm.tsx`)**:
- In `handleSubmit` and `handleDelete` `onConfirm` callbacks, introduce a local boolean flag `let success = false;`.
- Set `success = true` at the end of the `try` block, and remove `onSave()` and `onClose()` from the `try` block.
- In the `finally` block, only invoke `setLoading(false)` if `!success` (because successful completion will unmount the component anyway).
- If `success` is true, wrap the cleanup calls in a timeout: `setTimeout(() => { onSave(); onClose(); }, 0)`. This allows `ConfirmDialog`'s internal async operations and local state updates to complete safely while the component remains mounted.

## Verification Method
- **Code Check**: Ensure both `ConfirmDialog` instantiations include the `isLoading` prop.
- **Manual Test (Double Submit)**: Initiate a submission or deletion, click "Confirm", and verify the button enters a disabled/spinner state, blocking further clicks.
- **Manual Test (Unmount Leak)**: Perform successful submit and delete actions with the browser developer tools open, checking the console to confirm that "Warning: Can't perform a React state update on an unmounted component" is no longer logged.
