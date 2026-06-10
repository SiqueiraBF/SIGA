# Handoff Report: PCM Attachment Issues Fix

## 1. Observation
I investigated two issues raised about PCM file handling:
1. `pcmService.updateRequest` currently overwrites `anexo_pcm_url` to `null` if the partial update object `requestData` does not include `anexo_pcm_url` and no `files` are passed. I observed this in `src/services/pcmService.ts` at lines 223-231.
2. In the PCM UI Modals, when a user selects a file, removes it, and tries to re-select the exact same file, it fails because the `<input type="file" />` elements retain their `.value`. Consequently, the browser's `onChange` event isn't fired if the same path is picked. This was observed in `src/components/pcm/PcmRequestModal.tsx` and `src/components/pcm/PcmConfirmModal.tsx` where the inputs' `onChange` handlers do not clear the `e.target.value`.

## 2. Logic Chain
For the `pcmService` issue:
- In `updateRequest`, `combinedUrls` starts empty.
- If `requestData.anexo_pcm_url` is undefined, it stays empty.
- If `files` is empty or undefined, it stays empty.
- Then `finalAnexoUrl` evaluates to `null`.
- The update payload then forcefully includes `anexo_pcm_url: finalAnexoUrl` (which is `null`), destroying any existing attachments.
- **Fix Logic:** We must conditionally update `anexo_pcm_url` in the update payload only if `requestData.anexo_pcm_url` is explicitly provided or if new `files` are being uploaded. Otherwise, it should be omitted from the update payload.

For the input file clear issue:
- React's synthetic event passes the HTMLInputElement as `e.target`.
- Appending `e.target.value = '';` at the end of the `onChange` callback ensures the browser's internal file path buffer is reset immediately after the files are read and processed into React state.
- **Fix Logic:** Add `e.target.value = '';` into all four `onChange` handlers across both modals.

## 3. Caveats
- Setting `e.target.value = ''` works seamlessly in modern browsers. Since these inputs are uncontrolled (unmanaged value prop), this won't cause React loop issues.
- We must make sure that `delete updatePayload.anexo_pcm_url` is called if it was undefined to avoid any inadvertent updates if it slipped into `requestData` as undefined.

## 4. Conclusion
The implementer agent must:
1. Modify `src/services/pcmService.ts` to construct `updatePayload` dynamically, only setting `anexo_pcm_url` if it was explicitly defined in `requestData` or if `files` exist.

**Example `pcmService.ts` fix:**
```typescript
    const updatePayload: any = { ...requestData };
    
    if (requestData.anexo_pcm_url !== undefined || (files && files.length > 0)) {
      updatePayload.anexo_pcm_url = combinedUrls.length > 0 ? JSON.stringify(combinedUrls) : null;
    } else {
      delete updatePayload.anexo_pcm_url;
    }

    const { data, error } = await supabase
      .from('pcm_solicitacoes_compras')
      .update(updatePayload)
      .eq('id', id)
      .select('*, fazenda:fazendas(nome)')
      .single();
```

2. Modify `src/components/pcm/PcmRequestModal.tsx` to add `e.target.value = '';` in its two file inputs.
3. Modify `src/components/pcm/PcmConfirmModal.tsx` to add `e.target.value = '';` in its two file inputs.

**Example input fix:**
```tsx
<input id="..." name="..." type="file" multiple className="sr-only" onChange={(e) => {
  const validFiles = validateFiles(Array.from(e.target.files || []));
  if (validFiles.length > 0) {
    setFiles(prev => [...prev, ...validFiles]);
  }
  e.target.value = ''; // FIX: Reset input to allow re-upload
}} />
```

## 5. Verification Method
1. Start the app. Go to a PCM request that has an existing attachment. Update some textual field (e.g., Prioridade) without changing files. Check the database or UI to confirm the `anexo_pcm_url` is preserved and not null.
2. Open the "Nova Solicitação PCM" modal. Select a file. Click "Remover". Click the upload area and select the exact same file again. Verify that it appears in the list instead of silently failing.
