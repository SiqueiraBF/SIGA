# Handoff Report: PCM Lead Time & Attachments fixes

## 1. Observation
- In `src/services/pcmService.ts` inside the `updateRequest` method, the update payload always overrides `anexo_pcm_url` with `finalAnexoUrl`. If `requestData.anexo_pcm_url` is omitted (`undefined`) and there are no new files, `finalAnexoUrl` becomes `null`, and the database column is overwritten with `null`.
- In `src/components/pcm/PcmRequestModal.tsx` (lines 395, 410) and `src/components/pcm/PcmConfirmModal.tsx` (lines 335, 350), the `<input type="file">` elements do not clear `e.target.value` after processing the selected files in their `onChange` handlers.

## 2. Logic Chain
- To prevent wiping out existing attachments during a partial update that doesn't modify attachments, `pcmService.ts` needs to check if `anexo_pcm_url` is explicitly provided in `requestData` or if there are new files. If neither is true, it should remove `anexo_pcm_url` from the update payload.
- To allow users to re-upload the same file after removing it from the file list in the modals, the `<input type="file">` needs to clear its internal value after the files have been passed to `setFiles`. Adding `e.target.value = '';` at the end of the `onChange` callback ensures the browser will fire `onChange` again even if the exact same file is selected.

## 3. Caveats
- I did not verify if other sections of the system (outside of the PCM module) suffer from the same `<input type="file">` issue, as the scope was confined to PCM attachments.
- The `updatePayload` cast to `any` in `updateRequest` is used to allow `delete updatePayload.anexo_pcm_url`.

## 4. Conclusion
We must implement two specific changes to fix both issues:
1. Update `src/services/pcmService.ts` to conditionally include `anexo_pcm_url` in the Supabase update.
2. Update the `onChange` handlers in `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` to clear `e.target.value`.

### Proposed Changes

**`src/services/pcmService.ts` (around line 188)**

```typescript
    const updatePayload: any = { ...requestData };
    
    // Only process attachments if we have anexo_pcm_url in the payload or new files
    if (requestData.anexo_pcm_url !== undefined || (files && files.length > 0)) {
      let combinedUrls: string[] = [];
      if (requestData.anexo_pcm_url) {
        try {
          const parsed = JSON.parse(requestData.anexo_pcm_url);
          if (Array.isArray(parsed)) {
            combinedUrls = parsed;
          } else {
            combinedUrls = [requestData.anexo_pcm_url];
          }
        } catch (e) {
          combinedUrls = [requestData.anexo_pcm_url];
        }
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('pcm-anexos')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('pcm-anexos')
            .getPublicUrl(filePath);
            
          combinedUrls.push(urlData.publicUrl);
        }
      }

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

**`src/components/pcm/PcmRequestModal.tsx` (lines 395-400 and 410-415)**
**`src/components/pcm/PcmConfirmModal.tsx` (lines 335-340 and 350-355)**

Update all four `<input type="file" ... onChange={...} />` instances from:

```tsx
onChange={(e) => {
  const validFiles = validateFiles(Array.from(e.target.files || []));
  if (validFiles.length > 0) {
    setFiles(prev => [...prev, ...validFiles]);
  }
}}
```

To:

```tsx
onChange={(e) => {
  const validFiles = validateFiles(Array.from(e.target.files || []));
  if (validFiles.length > 0) {
    setFiles(prev => [...prev, ...validFiles]);
  }
  e.target.value = '';
}}
```

## 5. Verification Method
- **Issue 1:** Trigger an update to a PCM request using `pcmService.updateRequest(id, { prioridade: 'Urgente' })` (without providing `anexo_pcm_url` or `files`). Verify in the database that the existing `anexo_pcm_url` is not set to `null`.
- **Issue 2:** Open the PCM Request or Confirm modal. Select a file. Remove it by clicking "Remover". Click the upload button again and select the exact same file. It should appear in the preview list successfully.
