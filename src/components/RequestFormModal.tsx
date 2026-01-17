import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Building2, AlertTriangle, FileText, CheckCircle2, RotateCcw, Box, Plus, Pencil, Trash2, ArrowUpDown, Clock, Search, Send, Save, Ban, CheckCircle, Edit3, MousePointerClick } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/supabaseService';
import type { Solicitacao, Fazenda, Usuario } from '../types';
import { format } from 'date-fns';
import { RequestItemsTable } from './RequestFormModalComponents/RequestItemsTable';

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

  // Base State
  const [loading, setLoading] = useState(false);
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);

  // Form State - Context
  const [contextData, setContextData] = useState({
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
  const isNew = !requestId;
  const isOwner = user?.id === (initialData?.request?.usuario_id || user?.id);
  const isCorrectionMode = contextData.status === 'Devolvido';

  // Permissions
  const canEditContext = isNew || (contextData.status === 'Aberto' && isOwner) || isCorrectionMode;
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
  const canReopen = (contextData.status !== 'Aberto') && (
    hasFullManagement ||
    (isRegistrar && (contextData.status === 'Aguardando' || contextData.status === 'Em Cadastro'))
  );

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
    setContextData({
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
  };

  const loadDependencies = async () => {
    const farms = await db.getAllFarms();
    setFazendas(farms.filter(f => f.ativo));
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
    setContextData({
      solicitante: (req as any).usuario?.nome || 'Usuário',
      fazenda_id: req.fazenda_id,
      prioridade: req.prioridade as 'Normal' | 'Urgente',
      observacao: req.observacao_geral || '',
      data_abertura: req.data_abertura,
      status: req.status
    });
    setItems(reqItems.map(i => ({
      ...i,
      status: i.status_item || i.status
    })));
  };

  // --- Actions ---

  const handleGlobalAction = async (action: 'SAVE' | 'SEND' | 'START_CADASTRO' | 'FINISH_CADASTRO' | 'REOPEN' | 'RETURN' | 'DELETE') => {
    if (loading || isSubmittingRef.current) return;

    setLoading(true);
    isSubmittingRef.current = true;
    try {
      let reqId = currentRequestId;
      const payload: any = {
        usuario_id: initialData?.request?.usuario_id || user?.id,
        fazenda_id: contextData.fazenda_id,
        prioridade: contextData.prioridade,
        observacao_geral: contextData.observacao,
      };

      // 1. Save/Update Header
      if (!reqId) {
        if (action === 'SAVE' || action === 'SEND') {
          const newReq = await db.createRequest({ ...payload, status: 'Aberto' }, [], user!.id);
          reqId = newReq.id;
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
        onSave(); onClose();
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
        onSave(); onClose();
      }
      else if (action === 'RETURN') {
        await db.updateRequest(reqId, { status: 'Devolvido' }, user!.id);
        alert('Solicitação devolvida ao solicitante.');
        onSave(); onClose();
      }
      else if (action === 'REOPEN') {
        await db.updateRequest(reqId, { status: 'Aberto' }, user!.id); // Back to Draft effectively
        alert('Solicitação reaberta para edição (Rascunho).');
        onSave(); onClose();
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
          usuario_id: user!.id,
          fazenda_id: contextData.fazenda_id,
          prioridade: contextData.prioridade,
          observacao_geral: contextData.observacao,
          status: 'Aberto'
        }, [], user!.id);
        reqId = newReq.id;
        setCreatedRequestId(newReq.id);
      }

      const payload = {
        descricao: desc,
        marca: data.get('marca') as string,
        referencia: data.get('referencia') as string,
        unidade: data.get('unidade') as string,
        status_item: 'Pendente'
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

    const codUni = data.get('cod_uni') as string;
    const acao = data.get('acao') as string; // 'ok' or 'devolver'

    setLoading(true);
    try {
      let updateData: any = {};
      if (acao === 'devolver') {
        updateData = { status_item: 'Reprovado', motivo_reprovacao: 'Informações pendentes' }; // Simplified logic
      } else {
        // OK implies Approved or similar
        if (!codUni) throw new Error("Código UNI obrigatório para aprovar");
        updateData = { status_item: 'Aprovado', cod_reduzido_unisystem: codUni };
      }

      await db.updateItem(analystSelectedItem.id, updateData, user!.id);
      setItems(prev => prev.map(i => i.id === analystSelectedItem.id ? { ...i, ...updateData, status: updateData.status_item } : i));

      setAnalystSelectedItem(null); // Clear selection
      alert("Item analisado com sucesso!");

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
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Box size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                {isNew ? 'Nova Solicitação' : `Solicitação #${requestId?.split('-')[0] || '...'}`}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={contextData.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={24} />
          </button>
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
                    value={format(new Date(contextData.data_abertura), 'dd/MM/yyyy HH:mm')}
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

            {/* Top Section: Action Forms */}

            {/* 1. CREATOR MODE: New/Edit Item */}
            {!isAnalystMode && canEditItems && (
              <div className="p-6 bg-white border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">
                  <Plus size={12} /> {editingItem ? 'Editar Item' : 'Novo Item'}
                </div>
                <form ref={itemFormRef} onSubmit={handleCreatorItemSubmit}>
                  <div className="flex gap-4 mb-3">
                    <div className="flex-[3]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição</label>
                      <input name="descricao" type="text" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Nome do produto" required />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marca</label>
                      <input name="marca" type="text" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" placeholder="-" />
                    </div>
                    <div className="flex-[1]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidade</label>
                      <select name="unidade" className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white outline-none">
                        <option value="UN">UN</option>
                        <option value="KG">KG</option>
                        <option value="LT">LT</option>
                        <option value="CX">CX</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-[2]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Referência</label>
                      <input name="referencia" type="text" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" placeholder="-" />
                    </div>
                    <div className="flex-[4]">
                      {editingItem ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingItem(null); itemFormRef.current?.reset(); }} disabled={loading} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded text-xs uppercase hover:bg-slate-200 disabled:opacity-50">Cancelar</button>
                          <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded text-xs uppercase hover:bg-blue-700 disabled:opacity-50">{loading ? 'Salvando...' : 'Atualizar'}</button>
                        </div>
                      ) : (
                        <button type="submit" disabled={loading} className="w-full py-2 bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 font-bold rounded text-xs uppercase tracking-wide transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                          {loading ? '+ Adicionando...' : '+ Adicionar Item na Lista'}
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
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-4">
                      <CheckCircle size={12} /> Editar/Analisar Item
                    </div>
                    <form ref={analystFormRef} onSubmit={handleAnalystItemSubmit} className="p-4 rounded-xl border border-purple-100 bg-purple-50/30">
                      {/* Read Only Info */}
                      <div className="grid grid-cols-4 gap-4 mb-4 opacity-70 pointer-events-none">
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Descrição</label>
                          <input value={analystSelectedItem.descricao} readOnly className="w-full bg-slate-100 border-none rounded px-2 py-1 text-xs text-slate-600" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Marca</label>
                          <input value={analystSelectedItem.marca} readOnly className="w-full bg-slate-100 border-none rounded px-2 py-1 text-xs text-slate-600" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">UN</label>
                          <input value={analystSelectedItem.unidade} readOnly className="w-full bg-slate-100 border-none rounded px-2 py-1 text-xs text-slate-600" />
                        </div>
                      </div>

                      {/* Analysis Fields */}
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Cód. Uni *</label>
                          <input
                            name="cod_uni"
                            defaultValue={analystSelectedItem.cod_reduzido_unisystem || ''}
                            autoFocus
                            required
                            type="text"
                            className="w-full px-3 py-2 bg-white border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                        <div className="col-span-8 flex gap-3">
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="radio" name="acao" value="ok" defaultChecked className="text-purple-600 focus:ring-purple-500" />
                              <span>Ok</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="radio" name="acao" value="devolver" className="text-red-600 focus:ring-red-500" />
                              <span>Devolver</span>
                            </label>
                          </div>
                          <button type="button" onClick={() => setAnalystSelectedItem(null)} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase bg-white border border-slate-200 rounded hover:bg-slate-50">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 text-xs font-bold text-white uppercase bg-purple-600 rounded hover:bg-purple-700 shadow-sm">Salvar Análise do Item</button>
                        </div>
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
                          {isAnalystMode && <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase w-24">Cód. Uni</th>}
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
                            {isAnalystMode && (
                              <td className="py-2 px-4 text-xs font-mono text-purple-600">
                                {item.cod_reduzido_unisystem || '-'}
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
            {(isNew || (contextData.status === 'Aberto' && isOwner)) && (
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

            {/* Global Reopen Action */}
            {canReopen && (
              <button onClick={() => handleGlobalAction('REOPEN')} disabled={loading} className="px-5 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-sm hover:bg-yellow-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                <RotateCcw size={16} /> Reabrir
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
