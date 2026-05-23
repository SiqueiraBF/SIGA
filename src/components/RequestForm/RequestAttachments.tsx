import React, { useRef, useState } from 'react';
import { Paperclip, X, File as FileIcon, Image as ImageIcon, Download, Loader2 } from 'lucide-react';

interface RequestAttachmentsProps {
    attachments: any[];
    onUpload: (file: File) => Promise<void>;
    onDelete: (attachment: any) => Promise<void>;
    loading?: boolean;
    canEdit?: boolean;
}

export const RequestAttachments: React.FC<RequestAttachmentsProps> = ({
    attachments,
    onUpload,
    onDelete,
    loading,
    canEdit = true
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                await onUpload(files[i]);
            }
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const file = new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' });
                    await onUpload(file);
                }
            }
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                await onUpload(files[i]);
            }
        }
    };

    return (
        <div className="space-y-4" onPaste={handlePaste}>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 flex items-center gap-1.5">
                <Paperclip size={12} /> Anexos
            </label>
            
            {canEdit && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer
                        flex flex-col items-center justify-center gap-2
                        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}
                    `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple
                    />
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400">
                        <Paperclip size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] font-bold text-slate-600">Clique, arraste ou cole (Ctrl+V)</p>
                        <p className="text-[10px] text-slate-400">Imagens, PDFs, etc.</p>
                    </div>
                </div>
            )}

            {attachments.length > 0 && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {attachments.map((file) => (
                        <div key={file.id} className="group relative bg-white border border-slate-100 rounded-lg p-2 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                {file.file_type?.includes('image') ? <ImageIcon size={16} /> : <FileIcon size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-700 truncate leading-tight">{file.file_name}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-medium">
                                    {(file.file_size / 1024).toFixed(1)} KB • {file.usuario?.nome?.split(' ')[0]}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Use the public URL if possible or a signed URL approach
                                        // For simplicity, using a link to public bucket
                                        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/request-attachments/${file.file_path}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remover"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {loading && (
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
                    <Loader2 size={12} className="animate-spin" /> Processando arquivo...
                </div>
            )}
        </div>
    );
};
