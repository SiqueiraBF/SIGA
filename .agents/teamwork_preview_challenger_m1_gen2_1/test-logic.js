// test-logic.js
const assert = require('assert');

// Simulate the backend update logic
function simulateUpdateRequest(requestData_anexo_pcm_url, files) {
  let combinedUrls = [];
  if (requestData_anexo_pcm_url) {
    try {
      const parsed = JSON.parse(requestData_anexo_pcm_url);
      if (Array.isArray(parsed)) {
        combinedUrls = parsed;
      } else {
        combinedUrls = [requestData_anexo_pcm_url];
      }
    } catch (e) {
      combinedUrls = [requestData_anexo_pcm_url];
    }
  }

  if (files && files.length > 0) {
    for (const file of files) {
      combinedUrls.push("new_url_" + file);
    }
  }

  const finalAnexoUrl = combinedUrls.length > 0 ? JSON.stringify(combinedUrls) : null;
  return finalAnexoUrl;
}

// Test case 1: UI sends a stringified array of existing urls, no new files
let res = simulateUpdateRequest(JSON.stringify(["url1", "url2"]), []);
assert.strictEqual(res, JSON.stringify(["url1", "url2"]));

// Test case 2: UI sends stringified array of existing urls, with new files
res = simulateUpdateRequest(JSON.stringify(["url1", "url2"]), ["file1"]);
assert.strictEqual(res, JSON.stringify(["url1", "url2", "new_url_file1"]));

// Test case 3: UI sends empty array, with new files
res = simulateUpdateRequest(JSON.stringify([]), ["file1"]);
assert.strictEqual(res, JSON.stringify(["new_url_file1"]));

// Test case 4: UI sends empty array, no new files
res = simulateUpdateRequest(JSON.stringify([]), []);
assert.strictEqual(res, null);

// Test case 5: Legacy single url in DB (though UI stringifies whatever it parsed. Actually UI parses legacy to ["legacy"] and then stringifies to '["legacy"]')
res = simulateUpdateRequest(JSON.stringify(["legacy"]), ["file1"]);
assert.strictEqual(res, JSON.stringify(["legacy", "new_url_file1"]));

// What if requestData_anexo_pcm_url is just a regular string (e.g. from an API call that skips UI)?
res = simulateUpdateRequest("http://legacy.com/file.pdf", ["file1"]);
assert.strictEqual(res, JSON.stringify(["http://legacy.com/file.pdf", "new_url_file1"]));

console.log("All tests passed");
