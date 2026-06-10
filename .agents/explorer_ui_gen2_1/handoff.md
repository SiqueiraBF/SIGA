# Handoff: Elite UI Refactoring Bugfixes

## 1. Observation
- `src/components/ui/Modal.tsx`: Uses string interpolation ``className={`... ${className}`}`` without resolving Tailwind conflicts. Sets `document.body.style.overflow = ''` indiscriminately on unmount.
- `src/components/ui/ModalHeader.tsx`: Similar raw string interpolations (e.g. ``className={`... ${className}`}`` and `iconClassName`).
- `src/components/ui/ModalFooter.tsx`: Currently uses `<> ... </>` to render `startActions` and `endActions`, but completely ignores the `children` prop inside the truthy branch of `hasActions`.
- `src/components/savings/SavingFormModal.tsx`:
  - Parses currency values directly via `.replace(',', '.')` without stripping thousands separators (`.`), resulting in `NaN`.
  - Passes only `files` to `FileUpload`, ignoring the component's existing API `existingUrls` and `onExistingUrlsChange`.
  - Has unused `handleFileChange` and `removeAttachment` functions.
- `src/services/savingService.ts` and `src/components/ui/FileUpload.tsx`: Inspected to confirm that `FileUpload` expects signed URLs as an array of strings (`string[]`).

## 2. Logic Chain
- To resolve Tailwind conflicts, `twMerge` (from `tailwind-merge`) must be used for dynamic class concatenation in all `Modal` components.
- To prevent scroll lock leakage on nested modals, an external module-level counter (`let openModalsCount = 0;`) should track the number of open modals. It should reset the `body.style.overflow` only when `openModalsCount === 0`.
- To render `children` in `ModalFooter` with actions, we should render `{children}` alongside `{endActions}` inside the right-aligned flex container.
- To fix currency parsing in `SavingFormModal`, we must stringify the input, remove all periods (`.replace(/\./g, '')`), and then replace the comma with a period (`.replace(',', '.')`) before calling `Number()`.
- To correctly pass existing files to `FileUpload`, `SavingFormModal` must map `initialData.anexos` into signed URLs using `savingService.getAttachmentUrl(a.path)` inside a `Promise.all` and store them in a local state (`existingUrls`), passing it to `FileUpload`.
- Dead code in `SavingFormModal` should be safely stripped.

## 3. Caveats
- `savingService.update` currently does not natively support removing specific existing attachments from the array inside the database (it concatenates existing files with newly uploaded ones). The UI fix will visually allow removing files via `FileUpload`, but the backend service might need future adjustments to fully apply deletions in the DB. The scope of this handoff is strictly limited to the UI bugs reported.
- I am functioning in read-only mode, so changes are provided as diff snippets rather than being applied directly to the codebase.

## 4. Conclusion
The bugs have been analyzed and verified against the codebase. The implementation strategy requires editing 4 files with the exact snippets provided below. An implementer agent should execute these changes.

### Proposed Code Changes (Snippets)

**`src/components/ui/Modal.tsx`**
```tsx
import React, { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

let openModalsCount = 0;

// ... Inside Modal component:
  useEffect(() => {
    if (isOpen) {
      openModalsCount++;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (isOpen) {
        openModalsCount--;
        if (openModalsCount === 0) {
          document.body.style.overflow = '';
        }
      }
    };
  }, [isOpen]);

// ... Inside return:
      <div
        className={twMerge(
          'bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200',
          sizeClasses[size],
          className
        )}
      >
```

**`src/components/ui/ModalHeader.tsx`**
```tsx
import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// ... Inside return:
    <div
      className={twMerge('px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0', className)}
    >
// ...
          <div className={twMerge('border border-slate-100 shadow-sm', eliteStyle ? 'bg-slate-100 p-3 rounded-xl' : 'p-2 rounded-lg', iconClassName)}>
// ...
          <h2 className={twMerge('text-slate-800 leading-tight', eliteStyle ? 'text-2xl font-extrabold' : 'text-lg font-bold')}>{title}</h2>
```

**`src/components/ui/ModalFooter.tsx`**
```tsx
import React from 'react';
import { twMerge } from 'tailwind-merge';

// ... Inside return:
    <div
      className={twMerge(
        'px-6 py-4 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 items-center',
        hasActions ? 'justify-between' : 'justify-end',
        !noBorder ? 'border-t border-slate-100' : '',
        className
      )}
    >
      {hasActions ? (
        <>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
            {startActions}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {endActions}
            {children}
          </div>
        </>
      ) : (
        children
      )}
    </div>
```

**`src/components/savings/SavingFormModal.tsx`**
```tsx
// 1. Add state:
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  
// 2. Update useEffect:
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (initialData) {
        if (initialData.anexos && initialData.anexos.length > 0) {
          Promise.all(initialData.anexos.map(a => savingService.getAttachmentUrl(a.path)))
            .then(urls => setExistingUrls(urls.filter(Boolean) as string[]));
        } else {
          setExistingUrls([]);
        }

        setFormData({
          data: initialData.data.split('T')[0],
          // ... (keep the rest identical)
        });
      } else {
        setFormData(prev => ({
          ...prev,
          data: new Date().toISOString().split('T')[0]
        }));
        setExistingUrls([]);
      }
    } else {
      // Reset
      setExistingUrls([]);
      // ... (keep the rest identical)
    }
  }, [isOpen, initialData]);

// 3. Remove Dead Code:
  // Remove `handleFileChange` and `removeAttachment` entirely.

// 4. Update Number Parsing (in handleSubmit and calc variables):
  const valor_inicial = Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.'));
  const valor_final = Number(formData.valor_final.toString().replace(/\./g, '').replace(',', '.'));
  // ...
  const calcValorInicial = Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.') || 0);
  const calcValorFinal = Number(formData.valor_final.toString().replace(/\./g, '').replace(',', '.') || 0);

// 5. Update FileUpload prop injection:
            <FileUpload 
              files={attachments} 
              onFilesChange={setAttachments} 
              existingUrls={existingUrls}
              onExistingUrlsChange={setExistingUrls}
              compact 
            />
```

## 5. Verification Method
1. Ensure the implementer applies the snippets correctly.
2. Verify TypeScript compilation: Run `npx tsc --noEmit` or equivalent build command to ensure no type errors (e.g., related to `twMerge`).
3. Launch the app and test nested modals: opening a modal over another and closing the top one should leave the parent scroll locked.
4. Test Saving module inputs: enter `1.500,00` and confirm it is parsed as `1500.00` with accurate Saving calculations.
5. Edit an existing Saving to verify the signed URLs are fetched and loaded natively into the `FileUpload` UI.
