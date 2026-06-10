const assert = require('assert');

function testUpdate() {
  let finalAnexoUrlResult = undefined;
  
  // mock requestData that comes without anexo_pcm_url
  const requestData = { obs_pcm: "New observation" };
  const files = [];
  
  let combinedUrls = [];
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

  const finalAnexoUrl = combinedUrls.length > 0 ? JSON.stringify(combinedUrls) : null;
  
  const updatePayload = {
    ...requestData,
    anexo_pcm_url: finalAnexoUrl
  };
  
  console.log("Update Payload:", updatePayload);
  if (updatePayload.anexo_pcm_url === null && requestData.anexo_pcm_url === undefined) {
    console.log("BUG DETECTED: anexo_pcm_url is overwritten to null even when it was not provided in requestData.");
  }
}

testUpdate();
