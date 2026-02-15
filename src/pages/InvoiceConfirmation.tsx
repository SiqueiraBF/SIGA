
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const InvoiceConfirmation = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processando confirmação...');

    useEffect(() => {
        if (!id) {
            setStatus('error');
            setMessage('Link inválido. ID da nota não fornecido.');
            return;
        }

        confirmView();
    }, [id]);

    const confirmView = async () => {
        try {
            // Chama a RPC (Função de Banco) que criamos
            const { data, error } = await supabase.rpc('confirm_invoice_view', { invoice_id: id });

            if (error) throw error;

            // O RPC retorna um JSON { success: true/false, message: '...' }
            // Precisamos tratar o retorno corretamente
            if (data && data.success) {
                setStatus('success');
                setMessage(data.message || 'Recebimento confirmado com sucesso!');
            } else {
                // Caso já tenha confirmado antes ou ID não exista
                setStatus(data?.message === 'Já confirmado anteriormente' ? 'success' : 'error');
                setMessage(data?.message || 'Erro ao confirmar.');
            }

        } catch (err: any) {
            console.error('Erro na confirmação:', err);
            setStatus('error');
            setMessage('Falha na comunicação com o servidor.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center animate-fadeIn">

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                        <h2 className="text-xl font-semibold text-gray-700">Confirmando Recebimento...</h2>
                        <p className="text-gray-500">Por favor, aguarde.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Confirmado!</h2>
                        <p className="text-gray-600">{message}</p>

                        <p className="text-sm text-gray-400 mt-4">Você já pode fechar esta janela.</p>
                        <button
                            onClick={() => window.close()}
                            className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Fechar Janela
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Ops!</h2>
                        <p className="text-red-600 font-medium">{message}</p>
                        <p className="text-gray-500 text-sm">Verifique se o link está correto ou contate o suporte.</p>
                    </div>
                )}

            </div>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-400">Sistema SIGA - Módulo de Gestão de NFs</p>
            </div>
        </div>
    );
};
