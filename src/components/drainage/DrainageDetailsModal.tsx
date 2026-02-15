import React, { useState } from 'react';
import { X, Edit2, Trash2, Calendar, Droplet, User, MapPin, CheckCircle, AlertCircle, Clock, Mail } from 'lucide-react';
import { StationDrainage, drainageService } from '../../services/drainageService';
import { format, parseISO } from 'date-fns';
import { DrainageFormModal } from './DrainageFormModal';
import { useAuth } from '../../context/AuthContext';

interface DrainageDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    drainage: StationDrainage | null;
    onUpdate: () => void; // Refresh list
}

export function DrainageDetailsModal({ isOpen, onClose, drainage, onUpdate }: DrainageDetailsModalProps) {
    const { user, role } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!isOpen || !drainage) return null;

    const isAdmin = role?.nome === 'Administrador';
    const isOwner = drainage.usuario_id === user?.id;
    const canEdit = isAdmin || isOwner;
    const canDelete = isAdmin;

    const handleDelete = async () => {
        if (confirm('Tem certeza que deseja excluir este registro de drenagem?')) {
            setDeleting(true);
            try {
                await drainageService.deleteDrainage(drainage.id);
                onUpdate();
                onClose();
            } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir registro.');
            } finally {
                setDeleting(false);
            }
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Detalhes da Drenagem</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <Calendar size={14} />
                                {format(parseISO(drainage.data_drenagem), "dd/MM/yyyy")}
                                <span className="mx-1">•</span>
                                <MapPin size={14} />
                                {drainage.posto?.nome}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Volume Drenado</label>
                                <div className="text-2xl font-bold text-blue-600 flex items-baseline gap-1">
                                    {drainage.litros_drenados.toLocaleString('pt-BR')} <span className="text-sm">Litros</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Responsável</label>
                                <div className="text-base font-medium text-slate-700 flex items-center gap-2">
                                    <User size={16} className="text-slate-400" />
                                    {drainage.usuario?.nome}
                                </div>
                            </div>
                        </div>


                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-2">Aspecto do Resíduo</h3>
                                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm">
                                    {drainage.aspecto_residuo}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-2">Destino</h3>
                                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm">
                                    {drainage.destino_residuo}
                                </div>
                            </div>

                            {drainage.observacoes && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-2">Observações</h3>
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm italic">
                                        {drainage.observacoes}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Photos */}
                        {drainage.fotos && drainage.fotos.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Droplet size={16} /> Evidências Fotográficas ({drainage.fotos.length})
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {drainage.fotos.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 block hover:shadow-md transition-all"
                                        >
                                            <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div >

                    {/* Footer Actions */}
                    < div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 justify-between" >
                        {
                            canDelete ? (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {deleting ? 'Excluindo...' : <><Trash2 size={18} /> Excluir Registro</>}
                                </button>
                            ) : <div />
                        }

                        <div className="flex gap-3">
                            {canEdit && (
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Edit2 size={18} /> Editar
                                </button>
                            )}
                        </div>
                    </div >
                </div >
            </div >

            {/* Edit Form Modal (Opens on top or replaces) */}
            < DrainageFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    onUpdate(); // Refresh list
                    onClose(); // Close details modal too (optional, or just refresh details? lets close to be simple)
                }}
                initialData={drainage}
            />
        </>
    );
}
