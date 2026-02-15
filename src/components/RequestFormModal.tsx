import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Building2, AlertTriangle, FileText, CheckCircle2, RotateCcw, Box, Plus, Pencil, Trash2, ArrowUpDown, Clock, Search, Send, Save, Ban, CheckCircle, Edit3, MousePointerClick, Package, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import type { Solicitacao, Fazenda, Usuario } from '../types';
import { format } from 'date-fns';
import { formatInSystemTime } from '../utils/dateUtils';
import { RequestItemsTable } from './RequestFormModalComponents/RequestItemsTable';
import { AuditLogModal } from './AuditLogModal';

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  requestId: string | null;
  initialData?: any;
}

export const RequestFormModal: React.FC<RequestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  requestId,
  initialData
}) => {
  const { user, checkAccess } = useAuth();
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const currentRequestId = requestId || createdRequestId;
  const [fullRequest, setFullRequest] = useState<any>(null); // Store full request for notification usage

  // Base State
  const [loading, setLoading] = useState(false);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Form State - Context
  const [contextData, setContextData] = useState({
    numero: null as number | null, // Added for UI display
    solicitante: user?.nome || '',
    fazenda_id: user?.fazenda_id || '',
    prioridade: 'Normal' as 'Normal' | 'Urgente',
    observacao: '',
    data_abertura: new Date().toISOString(),
    status: 'Aberto'
  });

  // Items State
  const [items, setItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null); // For Creator editing
  const [analystSelectedItem, setAnalystSelectedItem] = useState<any | null>(null); // For Analyst processing

  const itemFormRef = useRef<HTMLFormElement>(null);
  const analystFormRef = useRef<HTMLFormElement>(null);
  const isSubmittingRef = useRef(false); // Ref to prevent race conditions

  // Computed
  const isNew = !currentRequestId;
  // Permissions State
  const [requestOwnerId, setRequestOwnerId] = useState<string | null>(initialData?.request?.usuario_id || null);

  // Computed
  const isOwner = isNew ? true : (user?.id === requestOwnerId);
  const isCorrectionMode = contextData.status === 'Devolvido';

  // Permissions
  const canEditContext = isNew || (contextData.status === 'Aberto' && isOwner);
  const canEditItems = isNew || (contextData.status === 'Aberto' && isOwner) || isCorrectionMode;

  const canAnalyze = checkAccess({ module: 'abrir_solicitacao', action: 'confirm' });
  // Analyst Mode now ONLY active for item editing if 'Em Cadastro'. 
  // 'Aguardando' is just for starting the process.
  const isAnalystMode = canAnalyze && (contextData.status === 'Em Cadastro');
  const isRegistrar = canAnalyze; // Alias for having the permission generally

  // Check for Full Management (Edit All) capability
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
      action: 'edit', // Indirectly checking if they have basic edit rights, but specific role logic handles the nuances. 
      // Actually, per requirement: "se for = solicitante rascunho (OWN_PENDING), só pode aparecer para quem criou o formulario e o status deve ser aguardando."
      // We already check isOwner and status. We just need to ensure they have the *capability* to be an author/editor.
      // But simpler: just check permission scope.
      resourceOwnerId: user?.id,
      resourceStatus: 'PENDENTE' // This dummy check confirms they have at least OWN_PENDING edit rights
    }));

  // Load Data
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
    setCreatedRequestId(null); // Clear any previously created ID
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
      alert(`Erro ao carregar dados: ${errorMessage}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (req: Solicitacao, reqItems: any[]) => {
    setFullRequest(req); // Save full object
    setContextData({
      numero: req.numero,
      solicitante: (req as any).usuario?.nome || 'Usuário',
      fazenda_id: req.fazenda_id,
      prioridade: req.prioridade as 'Normal' | 'Urgente',
      observacao: req.observacao_geral || '',
      data_abertura: req.data_abertura,
      status: req.status
    });
    setRequestOwnerId(req.usuario_id); // Set correct owner
    setItems(reqItems.map(i => ({
      ...i,
      status: i.status_item || i.status
    })));
  };

  // --- Actions ---

  const handleGlobalAction = async (action: 'SAVE' | 'SEND' | 'START_CADASTRO' | 'FINISH_CADASTRO' | 'REOPEN' | 'RETURN' | 'DELETE' | 'RESEND') => {
    if (loading || isSubmittingRef.current) return;

    setLoading(true);
    isSubmittingRef.current = true;
    try {
      let reqId = currentRequestId;

      // FIX: Never overwrite requester on update. Use existing owner ID or current user ONLY if creating new.
      const ownerToSave = isNew ? user!.id : (requestOwnerId || user!.id);

      const payload: any = {
        usuario_id: ownerToSave,
        fazenda_id: contextData.fazenda_id,
        prioridade: contextData.prioridade,
        observacao_geral: contextData.observacao,
      };

      // 1. Save/Update Header
      if (!reqId) {
        if (action === 'SAVE' || action === 'SEND') {
          const newReq = await db.createRequest({ ...payload, status: 'Aberto' }, [], user!.id);
          reqId = newReq.id;
          setCreatedRequestId(newReq.id); // Validating New ID
          setContextData(prev => ({ ...prev, numero: newReq.numero })); // Update number for UI
          setRequestOwnerId(newReq.usuario_id); // Ensure state is synced
        }
      } else {
        await db.updateRequest(reqId, payload, user!.id);
      }

      if (!reqId) throw new Error("ID da solicitação inválido");

      // 2. Specific Logic
      if (action === 'SEND') {
        if (items.length === 0) { alert("Adicione itens antes de enviar."); setLoading(false); return; }
        await db.updateRequest(reqId, { status: 'Aguardando' }, user!.id);
        alert('Solicitação enviada com sucesso!');
        setContextData(prev => ({ ...prev, status: 'Aguardando' }));
        onSave();
      }
      else if (action === 'START_CADASTRO') {
        await db.updateRequest(reqId, { status: 'Em Cadastro' }, user!.id);
        setContextData(prev => ({ ...prev, status: 'Em Cadastro' }));
        alert('Cadastro iniciado!');
      }
      else if (action === 'FINISH_CADASTRO') {
        const hasPending = items.some(i => i.status === 'Pendente');
        if (hasPending) { alert('Existem itens pendentes de análise.'); setLoading(false); return; }
        await db.updateRequest(reqId, { status: 'Finalizado' }, user!.id);
        alert('Finalizado com sucesso!');
        setContextData(prev => ({ ...prev, status: 'Finalizado' }));
        onSave();
      }
      else if (action === 'RETURN') {
        await db.updateRequest(reqId, { status: 'Devolvido' }, user!.id);
        alert('Solicitação devolvida ao solicitante.');
        setContextData(prev => ({ ...prev, status: 'Devolvido' }));
        onSave();
      }
      else if (action === 'RESEND') {
        const hasRejections = items.some(i => i.status === 'Reprovado' || i.status === 'Devolvido');
        if (hasRejections) {
          alert('Você ainda possui itens reprovados. Corrija-os ou exclua-os antes de reenviar.');
          setLoading(false);
          return;
        }
        await db.updateRequest(reqId, { status: 'Aguardando' }, user!.id);
        alert('Correção enviada para análise!');
        setContextData(prev => ({ ...prev, status: 'Aguardando' }));
        onSave();
      }
      else if (action === 'REOPEN') {
        await db.updateRequest(reqId, { status: 'Aberto' }, user!.id); // Back to Draft effectively
        alert('Solicitação reaberta para edição (Rascunho).');
        setContextData(prev => ({ ...prev, status: 'Aberto' }));
        onSave();
      }
      else if (action === 'DELETE') {
        if (confirm("Excluir solicitação permanentemente?")) {
          await db.deleteRequest(reqId);
          onSave(); onClose();
        }
      }
      else { // SAVE
        if (isNew) {
          alert('Rascunho criado!');
          onSave(); onClose();
        } else {
          alert('Dados salvos!');
        }
      }

    } catch (err: any) {
      console.error(err);
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // --- Creator Item Logic ---
  const handleCreatorItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent race conditions and double clicks
    if (isSubmittingRef.current || loading) return;

    const form = itemFormRef.current;
    if (!form) return;
    const data = new FormData(form);
    const desc = data.get('descricao') as string;

    if (!desc) return alert("Descrição obrigatória");

    // Validate Observation (Mandatory)
    if (!contextData.observacao || !contextData.observacao.trim()) {
      alert('O campo Observação é obrigatório para adicionar itens à solicitação.');
      // Highlight the field if possible or just focus it?
      // For now, alert is sufficient as per request implies functionality block.
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

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
      } else {
        // If just adding items to existing, ensure we don't accidentally update header with WRONG owner if we were to act on header. 
        // But db.addItemToRequest strictly adds item. 
        // HOWEVER, does it update header? No usually.
        // BUT if we are paranoid, we should ensure contextData owner is preserved if we ever update header here.
        // We are NOT updating header here explicitly, just adding item.
      }



      const payload = {
        descricao: desc,
        marca: data.get('marca') as string,
        referencia: data.get('referencia') as string,
        unidade: data.get('unidade') as string,
        status_item: 'Pendente' as const
      };

      if (editingItem) {
        await db.updateItem(editingItem.id, payload, user!.id);
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload, status: 'Pendente' } : i));
        setEditingItem(null);
      } else {
        const newItem = await db.addItemToRequest(reqId!, payload, user!.id);
        // Prepend to list (Newest First)
        setItems(prev => [{ ...newItem, status: 'Pendente' }, ...prev]);
      }
      form.reset();
      // Keep focus management
      setTimeout(() => form.querySelector<HTMLInputElement>('input[name="descricao"]')?.focus(), 100);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar item");
    }
    finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // --- Analyst Item Logic ---
  const handleAnalystItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analystSelectedItem) return;

    const form = analystFormRef.current;
    if (!form) return;
    const data = new FormData(form);

    const inputValue = data.get('cod_uni') as string;
    const tipoTratativa = data.get('tipo_tratativa') as string;

    if (!tipoTratativa) {
      alert("Selecione uma classificação para o cadastro (Novo, Reativado, Existente ou Correção)");
      return;
    }

    setLoading(true);
    try {
      let updateData: any = {};

      if (tipoTratativa === 'CORRECAO') {
        // Use the input value as the rejection reason
        if (!inputValue) throw new Error("Informe o motivo da correção.");
        updateData = {
          status_item: 'Reprovado',
          motivo_reprovacao: inputValue,
          tipo_tratativa: 'CORRECAO'
        };
      } else {
        // Validation for Approved types
        if (!inputValue) throw new Error("Código UNI obrigatório para aprovar");

        updateData = {
          status_item: 'Aprovado',
          cod_reduzido_unisystem: inputValue,
          motivo_reprovacao: null,
          tipo_tratativa: tipoTratativa as any
        };
      }

      await db.updateItem(analystSelectedItem.id, updateData, user!.id);

      // Optimistic update
      setItems(prev => prev.map(i => i.id === analystSelectedItem.id ? { ...i, ...updateData, status: updateData.status_item } : i));

      setAnalystSelectedItem(null); // Clear selection
      // alert("Item analisado com sucesso!"); // Removed for smoother flow

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setTimeout(() => {
      if (itemFormRef.current) {
        const form = itemFormRef.current;
        const setVal = (name: string, val: string) => {
          const el = form.elements.namedItem(name) as HTMLInputElement;
          if (el) el.value = val;
        };
        setVal('descricao', item.descricao);
        setVal('marca', item.marca || '');
        setVal('referencia', item.referencia || '');
        setVal('unidade', item.unidade || 'UN');
      }
    }, 0);
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm('Remover este item?')) return;
    try {
      await db.deleteItem(item.id, user!.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifyWhatsapp = () => {
    if (!fullRequest) return;

    // Prepare data for generator
    // Ensure we have phone. If not in fullRequest.usuario, we can't send.
    const userPhone = fullRequest.usuario?.telefone;

    if (!userPhone) {
      alert("Usuário solicitante não possui telefone cadastrado.");
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

  // Render Helpers
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      'Aberto': { label: 'RASCUNHO', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
      'Aguardando': { label: 'AGUARDANDO', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'Em Cadastro': { label: 'EM CADASTRO', classes: 'bg-purple-50 text-purple-700 border-purple-200' },
      'Finalizado': { label: 'FINALIZADO', classes: 'bg-green-50 text-green-700 border-green-200' },
      'Devolvido': { label: 'DEVOLVIDO', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
    }[status] || { label: status.toUpperCase(), classes: 'bg-gray-100' };

    return (
      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide border ${config.classes}`}>
        {config.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors ${contextData.status === 'Finalizado' ? 'bg-green-50 text-green-600' :
              contextData.status === 'Aguardando' ? 'bg-amber-50 text-amber-600' :
                contextData.status === 'Em Cadastro' ? 'bg-purple-50 text-purple-600' :
                  contextData.status === 'Devolvido' ? 'bg-orange-50 text-orange-600' :
                    'bg-slate-100 text-slate-600' // Aberto/Rascunho
              }`}>
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {isNew && !contextData.numero ? 'Nova Solicitação' : `Solicitação #${contextData.numero || requestId?.split('-')[0] || '...'}`}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS:</span>
                <span className={`text-[11px] font-bold uppercase tracking-wide ${contextData.status === 'Finalizado' ? 'text-green-600' :
                  contextData.status === 'Aguardando' ? 'text-amber-600' :
                    contextData.status === 'Em Cadastro' ? 'text-purple-600' :
                      contextData.status === 'Devolvido' ? 'text-orange-600' :
                        'text-slate-500' // Rascunho
                  }`}>
                  {contextData.status === 'Aberto' ? 'RASCUNHO' : contextData.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={() => setIsAuditOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors uppercase tracking-wide"
                title="Ver Histórico de Alterações"
              >
                <Clock size={16} />
                <span className="hidden sm:inline">Histórico</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Column: Context */}
          <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <FileText size={12} /> Contexto
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Data Abertura</label>
                  <input
                    type="text"
                    value={formatInSystemTime(contextData.data_abertura)}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Solicitante</label>
                  <input
                    type="text"
                    value={contextData.solicitante}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Filial</label>
                  <select
                    value={contextData.fazenda_id}
                    onChange={e => setContextData({ ...contextData, fazenda_id: e.target.value })}
                    disabled={!canEditContext}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione...</option>
                    {fazendas.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prioridade</label>
                  <div className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => canEditContext && setContextData({ ...contextData, prioridade: 'Normal' })}
                      className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${contextData.prioridade === 'Normal' ? 'bg-white text-blue-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => canEditContext && setContextData({ ...contextData, prioridade: 'Urgente' })}
                      className={`py-1.5 text-xs font-bold rounded shadow-sm transition-all ${contextData.prioridade === 'Urgente' ? 'bg-white text-red-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      Urgente
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Observação <span className="text-red-500">*</span></label>
                  <textarea
                    value={contextData.observacao}
                    onChange={e => setContextData({ ...contextData, observacao: e.target.value })}
                    disabled={!canEditContext}
                    placeholder="Obrigatório para adicionar itens"
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none ${!contextData.observacao && canEditContext ? 'border-red-300 ring-1 ring-red-100 placeholder:text-red-300' : 'border-slate-200'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="flex-1 flex flex-col bg-slate-50/50 relative">

            {/* 1. CREATOR MODE: New/Edit Item */}
            {/* Rule: In 'Devolvido', only allow form if Editing. Do not show 'New Item'. */}
            {!isAnalystMode && canEditItems && (contextData.status !== 'Devolvido' || editingItem) && (
              <div className="p-6 bg-slate-50/80 border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
                <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                  <Plus size={14} className="text-slate-400" /> {editingItem ? 'EDITAR ITEM' : 'NOVO ITEM'}
                </div>

                {/* Rejection Feedback Alert */}
                {editingItem && (editingItem.status === 'Reprovado' || editingItem.status === 'Devolvido') && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Motivo da Devolução</h4>
                      <p className="text-sm text-red-600 font-medium">
                        {editingItem.motivo_reprovacao || editingItem.cod_reduzido_unisystem || "Verifique os dados e tente novamente."}
                      </p>
                    </div>
                  </div>
                )}

                <form ref={itemFormRef} onSubmit={handleCreatorItemSubmit} className="space-y-4">

                  {/* Row 1 */}
                  <div className="flex gap-4">
                    <div className="flex-[3]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                      <input
                        name="descricao"
                        type="text"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                        placeholder="Nome do produto"
                        required
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca</label>
                      <input
                        name="marca"
                        type="text"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                        placeholder="-"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade</label>
                      <div className="relative">
                        <select name="unidade" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none appearance-none cursor-pointer">
                          <option value="UN">UN</option>
                          <option value="KG">KG</option>
                          <option value="LT">LT</option>
                          <option value="CX">CX</option>
                          <option value="M">M</option>
                          <option value="PC">PC</option>
                        </select>
                        <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex gap-4 items-end">
                    <div className="flex-[2]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referência</label>
                      <input
                        name="referencia"
                        type="text"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 outline-none transition-shadow placeholder:text-slate-300"
                        placeholder="-"
                      />
                    </div>
                    <div className="flex-[4]">
                      {editingItem ? (
                        <div className="flex gap-2 h-[38px]">
                          <button type="button" onClick={() => { setEditingItem(null); itemFormRef.current?.reset(); }} disabled={loading} className="flex-1 bg-slate-200 text-slate-600 font-bold rounded-lg text-xs uppercase hover:bg-slate-300 disabled:opacity-50 transition-colors">Cancelar</button>
                          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold rounded-lg text-xs uppercase hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-200 transition-all">Atualizar Item</button>
                        </div>
                      ) : (
                        <button type="submit" disabled={loading} className="w-full h-[38px] bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 font-extrabold rounded-lg text-xs uppercase tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                          Adicionar Item na Lista
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* 2. ANALYST MODE */}
            {isAnalystMode && (
              <div className="p-6 bg-white border-b border-slate-200/60 shadow-sm z-20 min-h-[140px] flex flex-col justify-center">
                {analystSelectedItem ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                      <Clock size={14} className="text-purple-500" /> EDITAR/ANALISAR ITEM
                    </div>
                    <form ref={analystFormRef} onSubmit={handleAnalystItemSubmit} className="space-y-4">
                      {/* Hidden State for Action Selection */}
                      <div className="hidden">
                        {/* We will manage selection via state instead of direct radios for better control, or use radios with state */}
                      </div>

                      {/* Row 1: Read Only Data */}
                      <div className="flex gap-4">
                        <div className="flex-[3]">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descrição</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                            {analystSelectedItem.descricao}
                          </div>
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marca</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                            {analystSelectedItem.marca || '-'}
                          </div>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium flex items-center justify-between">
                            {analystSelectedItem.unidade}
                            <ArrowUpDown size={12} className="opacity-30" />
                          </div>
                        </div>
                      </div>

                      {/* Action Selection Grid */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Classificação do Cadastro <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'NOVO', label: 'NOVO', color: 'peer-checked:bg-green-500 peer-checked:text-white border-green-200 text-green-700 bg-green-50' },
                            { id: 'REATIVADO', label: 'REATIVADO', color: 'peer-checked:bg-blue-500 peer-checked:text-white border-blue-200 text-blue-700 bg-blue-50' },
                            { id: 'EXISTENTE', label: 'EXISTENTE', color: 'peer-checked:bg-amber-500 peer-checked:text-white border-amber-200 text-amber-700 bg-amber-50' },
                            { id: 'CORRECAO', label: 'CORREÇÃO', color: 'peer-checked:bg-red-500 peer-checked:text-white border-red-200 text-red-700 bg-red-50' }
                          ].map((opt) => (
                            <label key={opt.id} className="relative cursor-pointer group">
                              <input
                                type="radio"
                                name="tipo_tratativa"
                                value={opt.id}
                                className="peer sr-only"
                                required
                                onChange={(e) => {
                                  // Force re-render to update input label if needed
                                  // For simplicity using DOM manipulation or simpler react state if possible. 
                                  // But here we are in uncontrolled form mostly.
                                  // Let's use a small local state for the input label
                                  const lbl = document.getElementById('lbl-cod-uni');
                                  if (lbl) lbl.innerText = e.target.value === 'CORRECAO' ? 'Motivo da Correção *' : 'Cód. Uni *';

                                  const input = document.getElementById('input-cod-uni') as HTMLInputElement;
                                  if (input) {
                                    input.placeholder = e.target.value === 'CORRECAO' ? 'Descreva o motivo...' : 'Digite o código...';
                                    input.focus();
                                  }
                                }}
                              />
                              <div className={`w-full py-2 flex items-center justify-center rounded-lg text-[10px] font-extrabold border uppercase transition-all ${opt.color} opacity-60 peer-checked:opacity-100 peer-checked:shadow-md hover:opacity-80`}>
                                {opt.label}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Row 2: Input & Logic */}
                      <div className="flex gap-4 items-end">
                        <div className="flex-[2]">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Referência</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate">
                            {analystSelectedItem.referencia || '-'}
                          </div>
                        </div>

                        <div className="flex-[4]">
                          <label id="lbl-cod-uni" className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Cód. Uni <span className="text-purple-400">*</span></label>
                          <input
                            id="input-cod-uni"
                            name="cod_uni"
                            defaultValue={analystSelectedItem.cod_reduzido_unisystem || ''}
                            required
                            type="text"
                            className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow placeholder:text-slate-300"
                            placeholder="Selecione uma ação..."
                          />
                        </div>
                      </div>

                      {/* Footer Buttons */}
                      <div className="flex gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => setAnalystSelectedItem(null)}
                          className="px-6 py-3 bg-slate-50 text-slate-500 font-bold rounded-lg text-xs uppercase tracking-wide hover:bg-slate-100 transition-colors flex items-center gap-2"
                        >
                          CANCELAR <Ban size={14} className="opacity-50" />
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-purple-600 text-white font-extrabold rounded-lg text-sm uppercase tracking-wide hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} /> CONFIRMAR ANÁLISE
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[100px]">
                    <MousePointerClick size={24} className="opacity-50" />
                    <p className="text-xs font-medium">Selecione um item na tabela abaixo para<br />informar o Código UNI e validar.</p>
                  </div>
                )}
              </div>
            )}


            {/* Items Table Container */}
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 py-2 px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest z-10">
                <span>Itens da Solicitação</span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
              </div>
              <div className="h-full pt-10 overflow-y-auto">
                <div className="min-w-full inline-block align-middle">
                  <div className="border-b border-gray-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-10 text-center">#</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24 text-center">Status</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24">Marca</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-20">Ref</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-16 text-center">UN</th>
                          {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24">Cód. Uni</th>
                          )}
                          {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-28 text-center">Classificação</th>
                          )}
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-16 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => (
                          <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${analystSelectedItem?.id === item.id ? 'bg-purple-50 hover:bg-purple-50' : ''}`}>
                            <td className="py-2 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                            <td className="py-2 px-4 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.status === 'Aprovado' ? 'bg-green-50 text-green-600 border-green-200' :
                                item.status === 'Reprovado' || item.status === 'Devolvido' ? 'bg-red-50 text-red-600 border-red-200' :
                                  'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                {item.status === 'Pendente' ? 'Pendente' : item.status}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs text-slate-700 font-semibold">{item.descricao}</td>
                            <td className="py-2 px-4 text-xs text-slate-500">{item.marca || '-'}</td>
                            <td className="py-2 px-4 text-xs text-slate-500">{item.referencia || '-'}</td>
                            <td className="py-2 px-4 text-center text-xs text-slate-500">{item.unidade}</td>
                            {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                              <td
                                className={`py-2 px-4 text-xs font-mono font-bold truncate max-w-[150px] ${item.status === 'Aprovado' || item.status === 'Existente' || item.status === 'Reativado' ? 'text-green-600' :
                                  (item.status === 'Reprovado' || item.status === 'Devolvido') ? 'text-red-500' :
                                    'text-slate-400'
                                  }`}
                                title={item.status === 'Reprovado' ? (item.motivo_reprovacao || item.cod_reduzido_unisystem) : item.cod_reduzido_unisystem}
                              >
                                {(item.status === 'Reprovado' || item.status === 'Devolvido')
                                  ? (item.motivo_reprovacao || item.cod_reduzido_unisystem || 'Sem motivo')
                                  : (item.cod_reduzido_unisystem || '-')}
                              </td>
                            )}
                            {(isAnalystMode || ['Finalizado', 'Devolvido'].includes(contextData.status)) && (
                              <td className="py-2 px-4 text-center">
                                {item.tipo_tratativa ? (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.tipo_tratativa === 'NOVO' ? 'text-green-700 bg-green-50 border-green-200' :
                                      item.tipo_tratativa === 'REATIVADO' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                        item.tipo_tratativa === 'EXISTENTE' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                          'text-red-700 bg-red-50 border-red-200'
                                    }`}>
                                    {item.tipo_tratativa}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">-</span>
                                )}
                              </td>
                            )}
                            <td className="py-2 px-4 text-center">
                              {isAnalystMode ? (
                                <button
                                  onClick={() => setAnalystSelectedItem(item)}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Analisar Item"
                                >
                                  <Pencil size={14} />
                                </button>
                              ) : canEditItems ? (
                                contextData.status === 'Devolvido' && item.status === 'Aprovado' ? (
                                  <span className="text-slate-300">-</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditItem(item)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 text-sm italic">
                              Nenhum item adicionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>         </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
              Fechar / Cancelar
            </button>
            {canDelete && (
              <button onClick={() => handleGlobalAction('DELETE')} disabled={loading} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                <Trash2 size={16} /> Excluir
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {/* Save Draft Action */}
            {/* Save Draft Action */}
            {(isNew || (contextData.status === 'Aberto' && (isOwner || hasFullManagement))) && (
              <>
                <button onClick={() => handleGlobalAction('SAVE')} disabled={loading} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Save size={16} /> Salvar Dados
                </button>
                <button onClick={() => handleGlobalAction('SEND')} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Send size={16} /> {loading ? 'Enviando...' : 'Enviar Cadastro'}
                </button>
              </>
            )}

            {/* Waiting State Actions (Analyst Start) */}
            {contextData.status === 'Aguardando' && isRegistrar && (
              <>
                <button onClick={() => handleGlobalAction('START_CADASTRO')} disabled={loading} className="px-5 py-2 bg-purple-600 text-white font-bold rounded-lg text-sm hover:bg-purple-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Edit3 size={16} /> Iniciar Cadastro
                </button>
              </>
            )}

            {/* In Registration Actions (Analyst Work) */}
            {contextData.status === 'Em Cadastro' && isRegistrar && (
              <>
                {/* Show different Main Action based on items state */}
                {items.some(i => i.status === 'Reprovado' || i.status === 'Devolvido') ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleGlobalAction('RETURN')} disabled={loading} className="px-5 py-2 bg-red-500 text-white font-bold rounded-lg text-sm hover:bg-red-600 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                      <RotateCcw size={16} /> Devolver Solicitação
                    </button>
                    {/* Optional: Still allow Finish if they want to partial approve? Usually if rejected items exist, you return. But maybe user wants choice. 
                          For now, per request: "liberar a opção de devolver". We can show BOTH or just REPLACE.
                          Usually, if any item is rejected, the WHOLE request is returned for correction. 
                          So we prioritize Return. 
                      */}
                  </div>
                ) : (
                  <button onClick={() => handleGlobalAction('FINISH_CADASTRO')} disabled={loading} className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                    <CheckCircle size={16} /> Finalizar Cadastro
                  </button>
                )}
              </>
            )}

            {/* Finalized State Actions */}
            {/* Show Notify button for Finalized OR Devolvido (ONLY if Analyst/Registrar) */}
            {((contextData.status === 'Finalizado' || contextData.status === 'Devolvido') && isRegistrar) && (
              <button onClick={handleNotifyWhatsapp} className="px-5 py-2 bg-[#25D366] text-white font-bold rounded-lg text-sm hover:bg-[#128C7E] shadow-md transition-colors flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg> Notificar Solicitante
              </button>
            )}

            {/* Correction/Returned Actions (Owner) */}
            {contextData.status === 'Devolvido' && isOwner && (
              <button onClick={() => handleGlobalAction('RESEND')} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                <Send size={16} /> Reenviar Correção
              </button>
            )}

            {/* Global Reopen Action */}
            {canReopen && (
              <button onClick={() => handleGlobalAction('REOPEN')} disabled={loading} className="px-5 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                <RotateCcw size={16} /> Reabrir
              </button>
            )}
          </div>
        </div>

      </div>

      {currentRequestId && (
        <AuditLogModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          registroId={currentRequestId}
        />
      )}
    </div>
  );
};
