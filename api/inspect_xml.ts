
// Standalone script to fetch Nuntec XMLs
// Usage: npx tsx api/inspect_xml.ts

const BASE_URL = 'https://nadiana.nuntec.com.br';
const AUTH_USER = 'bruno.siqueira';
const AUTH_PASS = '98765412';

async function run() {
    console.log(`Fetching from: ${BASE_URL}...`);
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${AUTH_USER}:${AUTH_PASS}`));
    const since = "2026-02-10T00:00:00";

    try {
        // Check Supplies for embedded name
        const suppliesUrl = `${BASE_URL}/supplies.xml?created_at=${since}`;
        console.log(`GET ${suppliesUrl}`);
        const suppliesRes = await fetch(suppliesUrl, { headers });
        const suppliesText = await suppliesRes.text();
        console.log("--- SUPPLIES XML (First 5000 chars) ---");
        console.log(suppliesText.substring(0, 5000));

        // Check Companies
        const companiesUrl = `${BASE_URL}/companies.xml`;
        console.log(`\nGET ${companiesUrl}`);
        const companiesRes = await fetch(companiesUrl, { headers });
        if (companiesRes.ok) {
            console.log("--- COMPANIES XML ---");
            console.log((await companiesRes.text()).substring(0, 2000));
        } else {
            console.log(`Failed COMPANIES: ${companiesRes.status}`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
