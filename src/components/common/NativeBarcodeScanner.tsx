import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle } from 'lucide-react';

declare global {
    interface Window {
        BarcodeDetector?: any;
    }
}

interface NativeBarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
    expectedLength?: number;
}

export function NativeBarcodeScanner({ onScan, onClose, expectedLength }: NativeBarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let detector: any;
        let animationFrameId: number;

        const initCamera = async () => {
            // Verifica API Local
            if (!('BarcodeDetector' in window)) {
                setError('A leitura por câmera precisa de um Android atual (Google Chrome Browser). No iPhone, você ainda precisará digitar.');
                return;
            }

            try {
                // Instancia o Native Chrome API Decoder
                detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code'] });
                
                // Solicita feed da Câmera (ambiente do celular: Traseira)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true'); // essencial pra IOS
                    await videoRef.current.play();
                    setIsDetecting(true);
                    
                    // Começa analisar frame a frame
                    scanLoop();
                }

            } catch (err: any) {
                console.error("Camera fail:", err);
                const isDenied = err?.name === 'NotAllowedError' || err?.message?.includes('denied');
                setError(isDenied 
                    ? 'Acesso à câmera foi negado. Verifique as permissões do seu navegador.' 
                    : 'Câmera inacessível ou uso em HTTP sem certificado digital. Acesse em HTTPS, ou no Localhost.');
            }
        };

        const scanLoop = async () => {
            if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
                animationFrameId = requestAnimationFrame(scanLoop);
                return;
            }

            try {
                // A Mágica de IA Nativa (passa o ponteiro do elemento do video)
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                    const result = barcodes[0].rawValue;
                    
                    // Validação de segurança para códigos específicos (ex: NFe = 44 dígitos)
                    if (expectedLength) {
                        const numbersOnly = result.replace(/\D/g, '');
                        if (numbersOnly.length !== expectedLength) {
                            // Ignora a leitura (provavelmente cortada ou borrada) e tenta o próximo frame
                            animationFrameId = requestAnimationFrame(scanLoop);
                            return;
                        }
                    }

                    // Vibra o celular no sucesso
                    if (navigator.vibrate) navigator.vibrate(100);
                    
                    onScan(result);
                    return; // Para o fluxo imediatamente pois encontrou
                }
            } catch (err) {
                // Ignore silent tracking issues (blur, out of bound frames)
            }
            
            // Loop proximo frame do browser
            animationFrameId = requestAnimationFrame(scanLoop);
        };

        initCamera();

        // Cleanup
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            {/* Cabecalho de Retorno Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
                <span className="text-white font-semibold flex items-center gap-2">
                    <Camera size={20} /> Escaner Dinâmico
                </span>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-full text-white">
                    <X size={24} />
                </button>
            </div>

            {/* Area Principal da Câmera */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-900">
                {error ? (
                    <div className="text-center p-6 bg-zinc-800 rounded-3xl m-4 border border-zinc-700 shadow-xl max-w-sm">
                        <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
                        <h3 className="text-white font-bold text-lg mb-2">Ops! Sem Câmera</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-6">{error}</p>
                        <button 
                            onClick={onClose} 
                            className="w-full py-3 bg-orange-600 active:scale-95 transition-transform text-white rounded-xl font-bold"
                        >
                            Voltar para o Form
                        </button>
                    </div>
                ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            muted
                        />
                        {/* Máscara de Escrita Customizada (Grid Transparente no Meio) */}
                        <div className="absolute inset-0 z-0 flex flex-col pointer-events-none">
                            <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
                            <div className="h-48 w-full flex">
                                <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
                                <div className="w-11/12 max-w-sm rounded-xl relative overflow-hidden ring-4 ring-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                                    {/* Cantos guias */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-orange-500 rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-orange-500 rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-orange-500 rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-orange-500 rounded-br-xl" />
                                    
                                    {/* Scan Line effect Eletro */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 shadow-[0_0_20px_4px_rgba(249,115,22,0.8)] animate-[scan_2.5s_ease-in-out_infinite]" />
                                </div>
                                <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
                            </div>
                            <div className="flex-1 bg-black/50 backdrop-blur-[2px]"></div>
                        </div>

                        {/* Loading / Status da Câmera */}
                        {isDetecting ? (
                            <p className="absolute bottom-12 left-0 right-0 text-center text-white font-medium drop-shadow-md text-sm px-4">
                                Alinhe o código de barras (NFe) na área transparente. Faremos a leitura automaticamente.
                            </p>
                        ) : (
                            <p className="absolute bottom-12 left-0 right-0 text-center text-orange-400 font-bold animate-pulse">
                                Inicializando Câmera Lente Traseira...
                            </p>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    50% { top: 100%; transform: translateY(-100%); opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 0; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
