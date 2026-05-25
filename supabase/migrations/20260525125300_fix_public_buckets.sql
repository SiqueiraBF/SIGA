update storage.buckets
set public = true
where id in (
  'request-attachments',
  'savings_attachments',
  'pcm-anexos',
  'out_of_deadline_attachments',
  'invoices'
);
