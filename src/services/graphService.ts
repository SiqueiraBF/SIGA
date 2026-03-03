
// Configuração do Azure AD
const AZURE_CONFIG = {
    tenantId: (import.meta as any).env.VITE_AZURE_TENANT_ID || '',
    clientId: (import.meta as any).env.VITE_AZURE_CLIENT_ID || '',
    clientSecret: (import.meta as any).env.VITE_AZURE_CLIENT_SECRET || '', // CUIDADO: Em produção, usar variáveis de ambiente
    scope: 'https://graph.microsoft.com/.default'
};

interface EmailAddress {
    address: string;
    name?: string;
}

export interface GraphAttachment {
    name: string;
    contentType: string;
    contentBytes: string; // Base64
}

interface EmailMessage {
    subject: string;
    body: {
        contentType: 'Text' | 'HTML';
        content: string;
    };
    toRecipients: { emailAddress: EmailAddress }[];
    ccRecipients?: { emailAddress: EmailAddress }[];
    attachments?: {
        '@odata.type': '#microsoft.graph.fileAttachment';
        name: string;
        contentType: string;
        contentBytes: string;
    }[];
}

class GraphService {
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    /**
     * Obtém um token de acesso "Application" (Client Credentials Flow)
     */
    private async getAccessToken(): Promise<string | null> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append('client_id', AZURE_CONFIG.clientId);
            params.append('scope', AZURE_CONFIG.scope);
            params.append('client_secret', AZURE_CONFIG.clientSecret);
            params.append('grant_type', 'client_credentials');

            const response = await fetch(
                `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erro ao obter token Azure:', errorData);
                return null;
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            // Define expiração com margem de segurança de 5 minutos
            this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

            return this.accessToken;
        } catch (error) {
            console.error('Erro de rede ao obter token:', error);
            return null;
        }
    }

    /**
     * Envia e-mail usando a Supabase Edge Function (Bypass CORS)
     */
    async sendEmail(
        fromEmail: string,
        toEmails: string[],
        subject: string,
        htmlBody: string,
        ccEmails: string[] = [],
        attachments: GraphAttachment[] = []
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { supabase } = await import('../lib/supabase');

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: toEmails,
                    subject,
                    htmlBody,
                    cc: ccEmails,
                    attachments,
                    fromEmail // Optional: The Edge Function uses this to determine the sender context
                }
            });

            if (error) {
                console.error('Supabase Function Error:', error);
                return { success: false, error: error.message || 'Erro ao invocar função de e-mail' };
            }

            if (!data.success) {
                return { success: false, error: data.error || 'Erro desconhecido na função' };
            }

            return { success: true };

        } catch (error: any) {
            console.error('Exceção no envio de e-mail (Service):', error);
            return { success: false, error: error.message };
        }
    }
}

export const graphService = new GraphService();
