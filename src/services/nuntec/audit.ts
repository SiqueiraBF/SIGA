// DEPRECATED: This module was relocated to Vercel Serverless Function (/api/audit)
// to prevent massive XML parsing from blocking the client's main thread and to 
// avoid exposing Nuntec API credentials in the browser.

export async function getAuditDataService(): Promise<{ stats: any; data: any[] }> {
    console.error("CRITICAL ARCHITECTURE VIOLATION: Calling deprecated getAuditDataService.");
    throw new Error(
        "CRITICAL ERROR: Client-side Nuntec XML parsing is blocked by architecture policy. " +
        "Please rely on the Vercel Proxy by consuming `fetch('/api/audit')` or the `useAuditData` hook."
    );
}
