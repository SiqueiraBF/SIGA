import React, { useState } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';

interface PhotoEvidenceUploaderProps {
    photoPreviews: string[];
    onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDropFiles: (files: File[]) => void;
    onRemovePhoto: (index: number) => void;
}

export function PhotoEvidenceUploader({
    photoPreviews,
    onPhotoSelect,
    onDropFiles,
    onRemovePhoto,
}: PhotoEvidenceUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files).filter((file) =>
                file.type.startsWith('image/'),
            );
            if (newFiles.length > 0) {
                onDropFiles(newFiles);
            }
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2">
                <Camera size={14} /> EVIDÊNCIAS
            </label>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {photoPreviews.map((src, photoIdx) => (
                    <div
                        key={photoIdx}
                        className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm"
                    >
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => onRemovePhoto(photoIdx)}
                            className="absolute top-1 right-1 bg-black/50 md:bg-white/90 text-white md:text-red-500 p-1.5 rounded-full md:opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}

                {/* Camera Button for Mobile/Tablet */}
                <label className="flex md:hidden flex-col items-center justify-center aspect-square bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg active:bg-blue-100 transition-colors cursor-pointer text-blue-600">
                    <Camera size={20} />
                    <span className="text-[10px] font-bold mt-1">Câmera</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={onPhotoSelect}
                        className="hidden"
                    />
                </label>

                {/* Standard Upload Dropzone (Desktop focus) */}
                <label
                    className={`hidden md:flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg transition-all cursor-pointer group ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div
                        className={`p-1.5 rounded-full transition-colors mb-1 ${isDragging ? 'bg-blue-100' : 'bg-slate-50 group-hover:bg-blue-100'}`}
                    >
                        <Upload
                            size={18}
                            className={`${isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}
                        />
                    </div>
                    <span
                        className={`text-[10px] font-bold ${isDragging ? 'text-blue-700' : 'text-slate-500 group-hover:text-blue-700'}`}
                    >
                        {isDragging ? 'Solte aqui' : 'Adicionar Foto'}
                    </span>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={onPhotoSelect}
                        className="hidden"
                    />
                </label>
            </div>
        </div>
    );
}
