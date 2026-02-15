import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Parse Body
        const { to, subject, htmlBody, cc, attachments, fromEmail } = await req.json() as EmailPayload;

        if (!to || !subject || !htmlBody) {
            throw new Error('Missing required fields (to, subject, htmlBody)');
        }

        // 3. Get Azure AD Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', AZURE_CONFIG.clientId);
        tokenParams.append('scope', AZURE_CONFIG.scope);
        tokenParams.append('client_secret', AZURE_CONFIG.clientSecret);
        tokenParams.append('grant_type', 'client_credentials');

        const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams,
            }
        );

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Azure Token Error:', errorText);
            throw new Error(`Failed to get Azure token: ${tokenResponse.statusText}. Details: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 4. Determine Sender
        // Graph API requires the sender to be a user in the tenant.
        // Ensure we don't try to send as a gmail user if passed from frontend.
        let sender = fromEmail || 'fiscal@nadiana.com.br';
        if (sender.includes('@gmail.com') || sender.includes('@hotmail.com') || sender.includes('@outlook.com') || sender.includes('@yahoo.com')) {
            console.log(`Override external sender ${sender} to default fiscal@nadiana.com.br`);
            sender = 'fiscal@nadiana.com.br';
        }

        // 5. Construct Payload
        const graphAttachments = attachments?.map((att) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.name,
            contentType: att.contentType,
            contentBytes: att.contentBytes,
        }));

        const message = {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: htmlBody,
            },
            toRecipients: to.map((email) => ({ emailAddress: { address: email.trim() } })),
            ccRecipients: cc
                ?.filter((e) => e.trim() !== '')
                .map((email) => ({ emailAddress: { address: email.trim() } })),
            attachments: graphAttachments && graphAttachments.length > 0 ? graphAttachments : undefined,
        };

        // 6. Send Email
        const sendResponse = await fetch(
            `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, saveToSentItems: true }),
            }
        );

        if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            console.error('Graph API Error:', errorData);
            // Return 200 with success: false so client can see the error message
            return new Response(JSON.stringify({
                success: false,
                error: `${errorData.error?.message} (Tentativa de envio por: ${sender})`
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Email sent successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        // Return 200 with error details to avoid opaque 500 errors in client
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
