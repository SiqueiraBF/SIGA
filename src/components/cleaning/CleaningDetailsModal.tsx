import React, { useState } from 'react';
import { X, Calendar, User, MapPin, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { CleaningRegistry, cleaningService } from '../../services/cleaningService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

interface CleaningDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    registry: CleaningRegistry | null;
    onDeleteSuccess?: () => void;
}

export function CleaningDetailsModal({ isOpen, onClose, registry, onDeleteSuccess }: CleaningDetailsModalProps) {
    const { user, role } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !registry) return null;

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) return;

        setIsDeleting(true);
        try {
            await cleaningService.deleteCleaning(registry.id);
            if (onDeleteSuccess) onDeleteSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir o registro.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-blue-600" />
                        Detalhes do Registro
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Informações Gerais</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Fazenda</p>
                                        <p className="font-medium text-slate-700">{registry.fazenda?.nome}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Setor</p>
                                        <p className="font-medium text-slate-700">{registry.tipo}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Responsável e Data</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Registrado por</p>
                                        <p className="font-medium text-slate-700">{registry.usuario?.nome}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Data de Referência</p>
                                        <p className="font-medium text-slate-700">
                                            {format(new Date(registry.data + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Observations */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Observações</h3>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 italic">
                            {registry.observacoes || "Nenhuma observação registrada."}
                        </div>
                    </div>

                    {/* Photos */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Evidências Fotográficas ({registry.fotos?.length || 0})</h3>
                        {registry.fotos && registry.fotos.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {registry.fotos.map((foto, idx) => (
                                    <div key={idx} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all">
                                        <img
                                            src={foto}
                                            alt={`Evidência ${idx + 1}`}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            onClick={() => window.open(foto, '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                                            {/* Overlay */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic">Nenhuma foto anexada.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0 z-10">
                    {isAdmin ? (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg font-bold flex items-center gap-2 transition-all"
                        >
                            <Trash2 size={18} />
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
