import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function getCors(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const isAllowed = origin.includes('localhost') || origin.endsWith('nadiana.com.br') || origin.endsWith('vercel.app');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://siga.nadiana.com.br',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
}


// Configuração do Azure AD
const AZURE_CONFIG = {
    tenantId: Deno.env.get('AZURE_TENANT_ID') ?? '',
    clientId: Deno.env.get('AZURE_CLIENT_ID') ?? '',
    clientSecret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '',
    scope: 'https://graph.microsoft.com/.default',
};

interface EmailPayload {
    to: string[];
    subject: string;
    htmlBody: string;
    cc?: string[];
    attachments?: {
        name: string;
        contentType: string;
        contentBytes: string; // Base64
    }[];
    fromEmail?: string;
    replyToInternetMessageId?: string; // ID global da internet para agrupar
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCors(req) });
    }

    try {
        const body = await req.json();
        const { 
            to, subject, htmlBody, cc, attachments, 
            fromEmail, replyToInternetMessageId
        } = body as EmailPayload;

        if (!to || !subject || !htmlBody) {
            throw new Error('Missing required fields (to, subject, htmlBody)');
        }

        // 0. Validação de Segurança (Apenas Usuários Logados ou Service Role)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: getCors(req) });
        }
        
        const token = authHeader.replace('Bearer ', '');
        let isServiceRole = false;
        let isValidUser = false;
        
        if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
            isServiceRole = true;
        } else {
            const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
            const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
            if (user && !verifyError) isValidUser = true;
        }

        if (!isServiceRole && !isValidUser) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers: getCors(req) });
        }

        // 1. Validação de Segredos
        if (!AZURE_CONFIG.tenantId || !AZURE_CONFIG.clientId || !AZURE_CONFIG.clientSecret) {
            return new Response(JSON.stringify({
                success: false,
                error: `Configuração de segredos incompleta no Supabase.`,
            }), {
                headers: { ...getCors(req), 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 2. Get Azure AD Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', AZURE_CONFIG.clientId);
        tokenParams.append('scope', AZURE_CONFIG.scope);
        tokenParams.append('client_secret', AZURE_CONFIG.clientSecret);
        tokenParams.append('grant_type', 'client_credentials');

        const tokenUrl = `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams,
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            return new Response(JSON.stringify({
                success: false,
                error: `Erro de Token Azure: ${tokenResponse.statusText}`,
                graphError: errorText
            }), {
                headers: { ...getCors(req), 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 3. Determine Sender
        let sender = fromEmail || 'bruno.siqueira@nadiana.com.br';
        if (!sender.toLowerCase().endsWith('@nadiana.com.br')) {
            sender = 'bruno.siqueira@nadiana.com.br';
        }

        // 4. Construct Message Object for sendMail endpoint
        const graphAttachments = attachments?.map((att) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.name,
            contentType: att.contentType,
            contentBytes: att.contentBytes,
        }));

        const message: any = {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: htmlBody,
            },
            toRecipients: (Array.isArray(to) ? to : [to]).map((email) => ({ emailAddress: { address: String(email).trim() } })),
            ccRecipients: cc
                ? (Array.isArray(cc) ? cc : [cc]).filter((e) => e && String(e).trim() !== '').map((email) => ({ emailAddress: { address: String(email).trim() } }))
                : [],
            attachments: graphAttachments && graphAttachments.length > 0 ? graphAttachments : undefined,
        };

        // Adiciona headers de resposta se fornecidos (agrupamento básico)
        if (replyToInternetMessageId) {
            message.internetMessageHeaders = [
                { name: "In-Reply-To", value: replyToInternetMessageId },
                { name: "References", value: replyToInternetMessageId }
            ];
        }

        // 5. Enviar Diretamente usando /sendMail
        // Este endpoint exige apenas Mail.Send (não precisa de Mail.ReadWrite)
        const sendUrl = `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`;
        const sendResponse = await fetch(sendUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                saveToSentItems: "true"
            })
        });

        if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            console.error(`[SendEmail] Falha no sendMail:`, errorData);
            return new Response(JSON.stringify({
                success: false,
                error: `Erro da Microsoft: ${errorData.error?.message || 'Acesso negado'}`,
                sender: sender,
                graphError: errorData
            }), {
                headers: { ...getCors(req), 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log(`[SendEmail] Sucesso via sendMail`);
        return new Response(JSON.stringify({
            success: true,
            message: 'Email sent successfully via sendMail',
        }), {
            headers: { ...getCors(req), 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ success: false, error: msg }), {
            headers: { ...getCors(req), 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
