import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
// Carrega as variáveis de ambiente do .env.local manualmente
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Usar a chave de serviço (SERVICE_ROLE_KEY) para ignorar o RLS durante a importação em massa, 
// ou a chave anônima (ANON_KEY) se preferir, porém a service_role é mais segura para scripts admin.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Credenciais do Supabase não encontradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function formatCpfCnpj(v: string): string {
    const raw = v.replace(/\D/g, '');
    if (!raw) return '';
    
    // Se tiver até 11 dígitos, tratamos como CPF
    if (raw.length <= 11) {
        const padded = raw.padStart(11, '0');
        return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } 
    // Se tiver mais de 11, tratamos como CNPJ
    else {
        const padded = raw.padStart(14, '0');
        return padded.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
}

async function main() {
    const filePath = path.resolve(process.cwd(), 'lista_fornecedores.csv');
    if (!fs.existsSync(filePath)) {
        console.error('❌ Arquivo não encontrado:', filePath);
        return;
    }

    console.log('📄 Lendo arquivo CSV (latin1)...');
    const content = fs.readFileSync(filePath, 'latin1');
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

    console.log(`📊 Total de linhas encontradas: ${lines.length}`);
    
    const recordsToUpsert: any[] = [];
    const now = new Date().toISOString();

    // Loop a partir da linha 1 (pulando o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 4) continue;

        // B = NOME_CLIENTE (índice 1), C = NOME_FANTASIA (índice 2), D = CGC_CPF_CLI (índice 3)
        const razao_social = parts[1]?.trim();
        const nome_fantasia = parts[2]?.trim() || razao_social;
        const cgc_raw = parts[3]?.trim();

        if (!cgc_raw) continue;

        // Tratar o caso de múltiplos CNPJs (ex: "03312271/0001-70,03312271/0002-51")
        const documents = cgc_raw.split(',');
        for (const doc of documents) {
            const formatted = formatCpfCnpj(doc);
            if (formatted) {
                recordsToUpsert.push({
                    razao_social,
                    nome_fantasia,
                    cnpj: formatted,
                    ativo: true,
                    created_at: now
                });
            }
        }
    }

    // Deduplicar registros com o mesmo CNPJ (manter o último encontrado)
    const uniqueRecordsMap = new Map<string, any>();
    for (const rec of recordsToUpsert) {
        uniqueRecordsMap.set(rec.cnpj, rec);
    }
    const uniqueRecords = Array.from(uniqueRecordsMap.values());

    console.log(`✅ Extração concluída. Encontrados ${uniqueRecords.length} CNPJs únicos para inserção/atualização.`);
    
    console.log('🚀 Iniciando Upsert (Lotes de 500)...');
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
        const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
        
        // Upsert vai tentar inserir, mas se a restrição UNIQUE (cnpj) bater, ele faz o update
        const { error } = await supabase
            .from('suppliers')
            .upsert(batch, { onConflict: 'cnpj' });
            
        if (error) {
            console.error(`❌ Erro no lote ${i} - ${i + batch.length}:`, error.message);
        } else {
            console.log(`➡️ Lote ${i} a ${i + batch.length} processado com sucesso.`);
        }
    }
    
    console.log('🎉 Migração finalizada com sucesso!');
}

main().catch(console.error);
