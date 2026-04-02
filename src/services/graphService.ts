export interface GraphAttachment {
    name: string;
    contentType: string;
    contentBytes: string; // Base64
}

class GraphService {
    /**
     * Envia e-mail usando a Supabase Edge Function (Bypass CORS) e mantendo os Segredos protegidos na Nuvem.
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
