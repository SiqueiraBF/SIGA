
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/supabaseService';
import { notificationService } from '../../services/notificationService';
import { Solicitacao, Fazenda, Usuario } from '../../types';
import toast from 'react-hot-toast';

interface UseRequestFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    requestId: string | null;
    initialData?: any;
}

export function useRequestForm({ isOpen, onClose, onSave, requestId, initialData }: UseRequestFormProps) {
    const { user, checkAccess } = useAuth();
    const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
    const currentRequestId = requestId || createdRequestId;
    const [fullRequest, setFullRequest] = useState<any>(null);

    // Base State
    const [loading, setLoading] = useState(false);
    const [fazendas, setFazendas] = useState<Fazenda[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [isAuditOpen, setIsAuditOpen] = useState(false);

    // Form State - Context
    const [contextData, setContextData] = useState({
        numero: null as number | null,
        solicitante: user?.nome || '',
        fazenda_id: user?.fazenda_id || '',
        prioridade: 'Normal' as 'Normal' | 'Urgente',
        observacao: '',
        data_abertura: new Date().toISOString(),
        status: 'Aberto'
    });

    // Items State
    const [items, setItems] = useState<any[]>([]);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [analystSelectedItem, setAnalystSelectedItem] = useState<any | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        variant: 'danger' | 'warning' | 'info';
        confirmLabel: string;
        onConfirm: () => void | Promise<void>;
    }>({
        isOpen: false,
        title: '',
        description: '',
        variant: 'danger',
        confirmLabel: 'Confirmar',
        onConfirm: () => {},
    });

    const isSubmittingRef = useRef(false);

    // Permissions State
    const [requestOwnerId, setRequestOwnerId] = useState<string | null>(initialData?.request?.usuario_id || null);

    // Computed
    const isNew = !currentRequestId;
    const isOwner = isNew ? true : (user?.id === requestOwnerId);
    const isCorrectionMode = contextData.status === 'Devolvido';

    // Permissions logic
    const canEditContext = isNew || (contextData.status === 'Aberto' && isOwner);
    const canEditItems = isNew || (contextData.status === 'Aberto' && isOwner) || isCorrectionMode;

    const canAnalyze = checkAccess({ module: 'abrir_solicitacao', action: 'confirm' });
    const isAnalystMode = canAnalyze && (contextData.status === 'Em Cadastro');
    const isRegistrar = canAnalyze;

    const hasFullManagement = checkAccess({
        module: 'abrir_solicitacao',
        action: 'edit',
        resourceOwnerId: 'system_global_permission_check'
    });

    const canDelete = !isNew && ((isOwner && contextData.status === 'Aberto') || hasFullManagement);

    const canReopen =
        (hasFullManagement && contextData.status !== 'Aberto') ||
        (isOwner && contextData.status === 'Aguardando' && checkAccess({
            module: 'abrir_solicitacao',
            action: 'edit',
            resourceOwnerId: user?.id,
            resourceStatus: 'PENDENTE'
        }));

    const canEditAttachments = (contextData.status === 'Aberto' || contextData.status === 'Devolvido') && (isOwner || hasFullManagement);

    // Effects
    useEffect(() => {
        if (isOpen) {
            loadDependencies();
            if (requestId) {
                if (initialData) {
                    populateForm(initialData.request, initialData.items);
                } else {
                    loadRequestData(requestId);
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, requestId, initialData]);

    const resetForm = () => {
        setCreatedRequestId(null);
        setContextData({
            numero: null,
            solicitante: user?.nome || '',
            fazenda_id: user?.fazenda_id || '',
            prioridade: 'Normal',
            observacao: '',
            data_abertura: new Date().toISOString(),
            status: 'Aberto'
        });
        setItems([]);
        setEditingItem(null);
        setAnalystSelectedItem(null);
        setFullRequest(null);
        setAttachments([]);
    };

    const loadDependencies = async () => {
        const [farms, users] = await Promise.all([
            db.getAllFarms(),
            db.getAllUsers()
        ]);
        setFazendas(farms.filter(f => f.ativo));
        setUsuarios(users.filter(u => u.ativo));
    };

    const loadRequestData = async (id: string) => {
        setLoading(true);
        try {
            const req = await db.getRequestById(id);
            const reqItems = await db.getItemsByRequestId(id);
            if (req) populateForm(req, reqItems);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error(`Erro ao carregar dados: ${errorMessage}`);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentRequestId) {
            loadAttachments(currentRequestId);
        }
    }, [currentRequestId]);

    const loadAttachments = async (id: string) => {
        try {
            const data = await db.getAttachmentsByRequestId(id);
            setAttachments(data);
        } catch (err) {
            console.error('Error loading attachments:', err);
        }
    };

    const populateForm = (req: Solicitacao, reqItems: any[]) => {
        setFullRequest(req);
        setContextData({
            numero: req.numero,
            solicitante: (req as any).usuario?.nome || 'Usuário',
            fazenda_id: req.fazenda_id,
            prioridade: req.prioridade as 'Normal' | 'Urgente',
            observacao: req.observacao_geral || '',
            data_abertura: req.data_abertura,
            status: req.status
        });
        setRequestOwnerId(req.usuario_id);
        setItems(reqItems.map(i => ({
            ...i,
            status: i.status_item || i.status
        })));
    };

    // Actions
    const handleGlobalAction = async (action: 'SAVE' | 'SEND' | 'START_CADASTRO' | 'FINISH_CADASTRO' | 'REOPEN' | 'RETURN' | 'DELETE' | 'RESEND') => {
        if (loading || isSubmittingRef.current) return;

        setLoading(true);
        isSubmittingRef.current = true;
        try {
            let reqId = currentRequestId;
            const ownerToSave = isNew ? user!.id : (requestOwnerId || user!.id);

            const payload: any = {
                usuario_id: ownerToSave,
                fazenda_id: contextData.fazenda_id,
                prioridade: contextData.prioridade,
                observacao_geral: contextData.observacao?.toUpperCase(),
            };

            if (!reqId) {
                if (action === 'SAVE' || action === 'SEND') {
                    const newReq = await db.createRequest({ ...payload, status: 'Aberto' }, [], user!.id);
                    reqId = newReq.id;
                    setCreatedRequestId(newReq.id);
                    setContextData(prev => ({ ...prev, numero: newReq.numero }));
                    setRequestOwnerId(newReq.usuario_id);
                }
            } else {
                await db.updateRequest(reqId, payload, user!.id);
            }

            if (!reqId) throw new Error("ID da solicitação inválido");

            if (action === 'SEND') {
                if (items.length === 0) { toast.error("Adicione itens antes de enviar."); setLoading(false); return; }
                await db.updateRequest(reqId, { status: 'Aguardando', data_envio: new Date().toISOString() }, user!.id);
                toast.success('Solicitação enviada com sucesso!');
                setContextData(prev => ({ ...prev, status: 'Aguardando' }));
                onSave();
            }
            else if (action === 'START_CADASTRO') {
                await db.updateRequest(reqId, { status: 'Em Cadastro' }, user!.id);
                setContextData(prev => ({ ...prev, status: 'Em Cadastro' }));
                toast.success('Cadastro iniciado!');
            }
            else if (action === 'FINISH_CADASTRO') {
                const hasPending = items.some(i => i.status === 'Pendente');
                if (hasPending) { toast.error('Existem itens pendentes de análise.'); setLoading(false); return; }
                await db.updateRequest(reqId, { status: 'Finalizado' }, user!.id);
                toast.success('Finalizado com sucesso!');
                setContextData(prev => ({ ...prev, status: 'Finalizado' }));
                onSave();
            }
            else if (action === 'RETURN') {
                await db.updateRequest(reqId, { status: 'Devolvido' }, user!.id);
                toast.success('Solicitação devolvida ao solicitante.');
                setContextData(prev => ({ ...prev, status: 'Devolvido' }));
                onSave();
            }
            else if (action === 'RESEND') {
                const hasRejections = items.some(i => i.status === 'Reprovado' || i.status === 'Devolvido');
                if (hasRejections) {
                    toast.error('Você ainda possui itens reprovados. Corrija-os ou exclua-os antes de reenviar.');
                    setLoading(false);
                    return;
                }
                await db.updateRequest(reqId, { status: 'Aguardando', data_envio: new Date().toISOString() }, user!.id);
                toast.success('Correção enviada para análise!');
                setContextData(prev => ({ ...prev, status: 'Aguardando' }));
                onSave();
            }
            else if (action === 'REOPEN') {
                await db.updateRequest(reqId, { status: 'Aberto' }, user!.id);
                toast.success('Solicitação reaberta para edição (Rascunho).');
                setContextData(prev => ({ ...prev, status: 'Aberto' }));
                onSave();
            }
            else if (action === 'DELETE') {
                setLoading(false);
                isSubmittingRef.current = false;
                setConfirmDialog({
                    isOpen: true,
                    title: 'Excluir Solicitação',
                    description: 'Esta ação é irreversível. Todos os itens e anexos desta solicitação serão removidos permanentemente.',
                    variant: 'danger',
                    confirmLabel: 'Excluir Permanentemente',
                    onConfirm: async () => {
                        setLoading(true);
                        try {
                            await db.deleteRequest(reqId!);
                            toast.success('Solicitação excluída.');
                            onSave(); onClose();
                        } catch (err: any) {
                            toast.error(`Erro ao excluir: ${err.message}`);
                        } finally {
                            setLoading(false);
                        }
                    },
                });
                return;
            }
            else { // SAVE
                if (isNew) {
                    toast.success('Rascunho criado!');
                    onSave(); onClose();
                } else {
                    toast.success('Dados salvos!');
                }
            }

        } catch (err: any) {
            console.error(err);
            toast.error(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const saveItem = async (data: any) => {
        if (loading || isSubmittingRef.current) return;

        // Validate Observacao
        if (!contextData.observacao || !contextData.observacao.trim()) {
            toast.error('O campo Observação é obrigatório para adicionar itens à solicitação.');
            return;
        }

        setLoading(true);
        isSubmittingRef.current = true;

        try {
            let reqId = currentRequestId;
            if (!reqId) {
                // Create draft header first
                const newReq = await db.createRequest({
                    usuario_id: user!.id, // Creating new, so user is owner
                    fazenda_id: contextData.fazenda_id,
                    prioridade: contextData.prioridade,
                    observacao_geral: contextData.observacao,
                    status: 'Aberto'
                }, [], user!.id);
                reqId = newReq.id;
                setCreatedRequestId(newReq.id);
                setRequestOwnerId(user!.id); // Set owner!
                setContextData(prev => ({ ...prev, numero: newReq.numero })); // Update number for UI
            }

            const payload = {
                descricao: data.descricao?.toUpperCase(),
                marca: data.marca?.toUpperCase(),
                referencia: data.referencia?.toUpperCase(),
                unidade: data.unidade,
                status_item: 'Pendente' as const
            };

            if (editingItem) {
                await db.updateItem(editingItem.id, payload, user!.id);
                setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload, status: 'Pendente', analise_pdm_status: 'Pendente' } : i));
                setEditingItem(null);
                triggerPdmAnalysis(editingItem.id, { ...editingItem, ...payload });
            } else {
                const newItem = await db.addItemToRequest(reqId!, payload, user!.id);
                // Prepend to list (Newest First)
                setItems(prev => [{ ...newItem, status: 'Pendente', analise_pdm_status: 'Pendente' }, ...prev]);
                triggerPdmAnalysis(newItem.id, { ...newItem, ...payload });
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Erro ao salvar item: " + err.message);
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const triggerPdmAnalysis = async (itemId: string, itemData: any) => {
        try {
            const result = await db.analyzePdmItem(itemData);
            if (result && result.result) {
                setItems(prev => prev.map(i => 
                    i.id === itemId 
                        ? { 
                            ...i, 
                            analise_pdm_status: result.result.status, 
                            analise_pdm_msg: result.result.message,
                            analise_pdm_padronizado: result.result.descricao_padronizada
                          } 
                        : i
                ));
            }
        } catch (err: any) {
            console.error("Erro na análise PDM da IA:", err);
            const errorMsg = `Erro na IA: ${err.message}`;
            setItems(prev => prev.map(i => 
                i.id === itemId 
                    ? { ...i, analise_pdm_status: 'FALTANDO_INFO', analise_pdm_msg: errorMsg } 
                    : i
            ));
            
            // Persistir o erro no banco para que não suma ao recarregar a tela
            try {
                await db.updateItem(itemId, {
                    analise_pdm_status: 'FALTANDO_INFO',
                    analise_pdm_msg: errorMsg
                }, user!.id);
            } catch (dbErr) {
                console.error("Erro ao persistir status de falha da IA:", dbErr);
            }
        }
    };

    const handleReprocessAI = async (item: any) => {
        if (loading || isSubmittingRef.current) return;
        
        // 1. Set to pending in local state
        setItems(prev => prev.map(i => i.id === item.id ? { 
            ...i, 
            analise_pdm_status: 'Pendente', 
            analise_pdm_msg: undefined, 
            analise_pdm_padronizado: undefined 
        } : i));
        
        // 2. Clear status in DB so it persists reload
        try {
            await db.updateItem(item.id, { 
                analise_pdm_status: 'Pendente', 
                analise_pdm_msg: undefined, 
                analise_pdm_padronizado: undefined 
            }, user!.id);
        } catch (err) {
            console.error("Erro ao resetar status no BD", err);
        }

        // 3. Trigger analysis again
        triggerPdmAnalysis(item.id, item);
        toast.success("Reprocessamento IA iniciado!");
    };

    const analyzeItem = async (itemId: string, data: any) => {
        if (loading) return;
        setLoading(true);
        try {
            await db.updateItem(itemId, data, user!.id);
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...data, status: data.status_item } : i));
            setAnalystSelectedItem(null); // Clear selection
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNotifyWhatsapp = () => {
        if (!fullRequest) return;
        // Prepare data for generator
        // Ensure we have phone. If not in fullRequest.usuario, we can't send.
        const userPhone = fullRequest.usuario?.telefone;

        if (!userPhone) {
            toast.error("Usuário solicitante não possui telefone cadastrado.");
            return;
        }

        const requestForMsg = {
            numero: contextData.numero,
            solicitante_nome: contextData.solicitante,
            filial_nome: fazendas.find(f => f.id === contextData.fazenda_id)?.nome,
            prioridade: contextData.prioridade,
            observacao: contextData.observacao,
            status: contextData.status // Essential for detecting isDevolucao
        };

        const link = notificationService.generateWhatsappLink(requestForMsg, items, userPhone);
        if (link) {
            window.open(link, '_blank');
        }
    };

    const handleDeleteItem = (item: any) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Remover Item',
            description: `Deseja remover o item "${item.descricao || 'sem descrição'}" da solicitação?`,
            variant: 'danger',
            confirmLabel: 'Remover',
            onConfirm: async () => {
                try {
                    await db.deleteItem(item.id, user!.id);
                    setItems(prev => prev.filter(i => i.id !== item.id));
                    toast.success('Item removido.');
                } catch (err) {
                    console.error(err);
                    toast.error('Erro ao remover item.');
                }
            },
        });
    };

    const handleUploadAttachment = async (file: File) => {
        if (!canEditAttachments) {
            toast.error('Anexos só podem ser incluídos em solicitações com status Rascunho ou Devolvido.');
            return;
        }
        
        if (!currentRequestId) {
            if (!contextData.observacao || !contextData.observacao.trim()) {
                toast.error('Preencha a Observação antes de adicionar anexos.');
                return;
            }

            setLoading(true);
            try {
                const newReq = await db.createRequest({
                    usuario_id: user!.id,
                    fazenda_id: contextData.fazenda_id,
                    prioridade: contextData.prioridade,
                    observacao_geral: contextData.observacao,
                    status: 'Aberto'
                }, [], user!.id);
                setCreatedRequestId(newReq.id);
                setContextData(prev => ({ ...prev, numero: newReq.numero }));
                const newAttachment = await db.uploadAttachment(newReq.id, file, user!.id);
                setAttachments(prev => [newAttachment, ...prev]);
            } catch (err: any) {
                toast.error('Erro ao criar rascunho para anexo: ' + err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            const newAttachment = await db.uploadAttachment(currentRequestId, file, user!.id);
            setAttachments(prev => [newAttachment, ...prev]);
        } catch (err: any) {
            toast.error('Erro no upload: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAttachment = (attachment: any) => {
        if (!canEditAttachments) {
            toast.error('Anexos só podem ser removidos em solicitações com status Rascunho ou Devolvido.');
            return;
        }
        setConfirmDialog({
            isOpen: true,
            title: 'Remover Anexo',
            description: 'Deseja remover este anexo permanentemente?',
            variant: 'danger',
            confirmLabel: 'Remover',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await db.deleteAttachment(attachment.id, attachment.file_path);
                    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
                    toast.success('Anexo removido.');
                } catch (err: any) {
                    toast.error('Erro ao excluir: ' + err.message);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    return {
        // State
        contextData, setContextData,
        items, setItems,
        loading, setLoading,
        fazendas,
        isAuditOpen, setIsAuditOpen,
        editingItem, setEditingItem,
        analystSelectedItem, setAnalystSelectedItem,
        attachments, setAttachments,
        currentRequestId,
        isSubmittingRef,
        confirmDialog,
        setConfirmDialog,

        // Computed Permissions
        isNew,
        isOwner,
        isAnalystMode,
        isRegistrar,
        canEditContext,
        canEditItems,
        canEditAttachments,
        canDelete,
        canReopen,
        hasFullManagement,

        // Actions
        handleGlobalAction,
        handleNotifyWhatsapp,
        handleDeleteItem,
        saveItem,
        analyzeItem,
        handleReprocessAI,
        handleUploadAttachment,
        handleDeleteAttachment,
        user // Exposed for item creation logic
    };
}
