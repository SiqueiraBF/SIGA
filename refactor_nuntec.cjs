const fs = require('fs');
const path = require('path');

const legacyPath = path.resolve('src/services/nuntecService.legacy.ts');
let legacyCode = fs.readFileSync(legacyPath, 'utf8');

// 1. Injetar a função helper fetchProxy no topo (após os imports)
const fetchProxyFunc = `
/** Helper para o Proxy Edge Function */
async function fetchProxy(endpointUrl: string, options: any = {}) {
  // Extrair apenas o endpoint real (ex: /stations.xml?created_at=...)
  // endpointUrl geralmente vem como "\${config.BASE_URL}/endpoint..." ou "/api/nuntec/endpoint..."
  let endpoint = endpointUrl;
  if (endpoint.includes('/api/nuntec')) {
    endpoint = endpoint.split('/api/nuntec')[1] || endpoint;
  } else if (endpoint.startsWith('http')) {
    try {
      const url = new URL(endpoint);
      endpoint = url.pathname + url.search;
    } catch(e) {}
  }
  
  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

  const { data, error } = await supabase.functions.invoke('nuntec-proxy', {
    body: {
      endpoint: endpoint,
      method: options.method || 'GET',
      body: options.body
    }
  });

  if (error) {
    console.error('Nuntec Proxy Error:', error);
    return new Response(JSON.stringify({ error }), { status: 500, statusText: 'Proxy Error' });
  }

  // Edge Function retorna string XML. Construímos um Fake Response para manter a interface atual de .text()
  return new Response(data, { status: 200, statusText: 'OK' });
}
`;

// Inserir antes de "export const nuntecService"
legacyCode = legacyCode.replace('export const nuntecService = {', fetchProxyFunc + '\nexport const nuntecService = {');

// 2. Substituir todas as chamadas 'fetch(' ou 'await fetch(' por 'await fetchProxy('
// Como a maioria tem 'await fetch', podemos usar regex simples
legacyCode = legacyCode.replace(/await fetch\(/g, 'await fetchProxy(');
// Casos de 'fetch(' em Promise.all
legacyCode = legacyCode.replace(/fetch\(/g, 'fetchProxy(');
// Reverter os fetchProxyProxy se tiver acontecido (await fetch -> await fetchProxy, fetch -> fetchProxyProxy)
legacyCode = legacyCode.replace(/fetchProxyProxy\(/g, 'fetchProxy(');

// 3. Limpar Senhas Hardcoded e Header Basic Auth
legacyCode = legacyCode.replace(/AUTH_USER: 'integracao.gerente',/g, "AUTH_USER: 'PROTEGIDO',");
legacyCode = legacyCode.replace(/AUTH_PASS: '54v0imuy',/g, "AUTH_PASS: 'PROTEGIDO',");
legacyCode = legacyCode.replace(/headers\.set\('Authorization', 'Basic ' \+ btoa\(\`\$\{config\.AUTH_USER\}:\$\{config\.AUTH_PASS\}\`\)\);/g, "// Headers movidos para a Edge Function");

fs.writeFileSync(legacyPath, legacyCode);
console.log('legacy.ts refatorado.');

// --- Agora o api.ts ---
const apiPath = path.resolve('src/services/nuntec/api.ts');
let apiCode = fs.readFileSync(apiPath, 'utf8');

apiCode = apiCode.replace(/import \{ db \} from '\.\.\/supabaseService';/, "import { db } from '../supabaseService';\nimport { supabase } from '../../lib/supabase';");
apiCode = apiCode.replace(/AUTH_USER: config\.username \|\| DEFAULTS\.AUTH_USER,/g, "AUTH_USER: 'PROTEGIDO',");
apiCode = apiCode.replace(/AUTH_PASS: config\.password \|\| DEFAULTS\.AUTH_PASS,/g, "AUTH_PASS: 'PROTEGIDO',");

const apiFetch = `
export async function fetchNuntec(endpoint: string, config: NuntecConfig, headers: Headers): Promise<Response> {
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    const { data, error } = await supabase.functions.invoke('nuntec-proxy', {
        body: { endpoint: endpoint, method: 'GET' }
    });
    
    if (error) {
        throw new Error(\`Nuntec Proxy Request Failed: \${error.message}\`);
    }
    
    return new Response(data, { status: 200 });
}
`;
apiCode = apiCode.replace(/export async function fetchNuntec[\s\S]*?^}/m, apiFetch);

fs.writeFileSync(apiPath, apiCode);
console.log('api.ts refatorado.');
