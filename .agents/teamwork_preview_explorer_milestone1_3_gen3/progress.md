Last visited: 2026-06-04T20:55:00Z

Completed investigation of the two issues.
- `pcmService.updateRequest` overwrites `anexo_pcm_url` even if it is omitted from `requestData`.
- `<input type="file" />` elements in `PcmRequestModal.tsx` and `PcmConfirmModal.tsx` are missing `e.target.value = ''` in their `onChange` handlers.

Preparing `handoff.md` with the detailed fix strategy.
