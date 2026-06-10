const { differenceInMinutes } = require('date-fns');

// Test URL parsing logic
const testUrls = [
  'https://example.com/legacy.jpg',
  JSON.stringify(['https://example.com/new1.jpg', 'https://example.com/new2.jpg']),
  JSON.stringify('https://example.com/invalid_array.jpg')
];

testUrls.forEach(urlStr => {
  let urls = [];
  try {
    urls = JSON.parse(urlStr);
    if (!Array.isArray(urls)) urls = [urlStr];
  } catch (e) {
    urls = [urlStr];
  }
  console.log('Original:', urlStr, 'Parsed:', urls);
});

// Test lead time logic
const created_at = new Date('2026-06-04T10:00:00Z');
const data_confirmacao = new Date('2026-06-04T12:30:00Z');

// logic 1 (from PcmRequests.tsx)
const diffMs = data_confirmacao.getTime() - created_at.getTime();
const diffMins1 = Math.max(0, Math.floor(diffMs / 60000));
const hours1 = Math.floor(diffMins1 / 60);
const mins1 = diffMins1 % 60;
console.log(`Logic 1: ${hours1}h ${mins1}m`);

// logic 2 (from PcmDetailsModal.tsx)
const diffMins2 = differenceInMinutes(data_confirmacao, created_at);
const hours2 = Math.floor(diffMins2 / 60);
const mins2 = diffMins2 % 60;
const leadTime2 = hours2 > 0 ? `${hours2}h ${mins2}min` : `${mins2}min`;
console.log(`Logic 2: ${leadTime2}`);
