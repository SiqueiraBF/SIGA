import React, { useState, useRef, useEffect } from 'react';
import { X, Save, ArrowDownRight, ArrowUpRight, Camera, Search, Plus } from 'lucide-react';
import { usedItemsService, UsedItemCatalog, UsedItemStock, UsedItemTransaction } from '../../services/usedItemsService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { UsedItemCatalogModal } from './UsedItemCatalogModal';

interface UsedItemMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fazendaId: string;
  catalog: UsedItemCatalog[];
  stock: UsedItemStock[];
  editingTransaction?: UsedItemTransaction | null;
}

export function UsedItemMovementModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  fazendaId,
  catalog,
  stock,
  editingTransaction
}: UsedItemMovementModalProps) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [unidadeMedida, setUnidadeMedida] = useState('UN');
  const [marca, setMarca] = useState('');
  const [equipamentoDestino, setEquipamentoDestino] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  
  // Custom dropdown states
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setTipo(editingTransaction.tipo);
        setProdutoId(editingTransaction.produto_id);
        setQuantidade(editingTransaction.quantidade);
        setUnidadeMedida(editingTransaction.unidade_medida);
        setMarca(editingTransaction.marca || '');
        setEquipamentoDestino(editingTransaction.equipamento_destino || '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingTransaction]);

  const availableForExit = stock.filter(s => s.quantidade > 0);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCatalog = catalog.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo_item?.toString().includes(searchTerm)
  );

  const filteredExitStock = availableForExit.filter(s => 
    s.produto?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.produto?.codigo_item?.toString().includes(searchTerm)
  );

  const selectedProductName = editingTransaction?.produto?.nome || (tipo === 'ENTRADA' 
    ? catalog.find(c => c.id === produtoId)?.nome 
    : availableForExit.find(s => s.produto_id === produtoId)?.produto?.nome);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId || !quantidade || !user?.id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        // MODO EDIÇÃO
        await usedItemsService.updateTransaction(editingTransaction.id, {
          quantidade: Number(quantidade),
          marca: tipo === 'ENTRADA' ? marca : undefined,
          equipamento_destino: tipo === 'SAIDA' ? equipamentoDestino : undefined
        });
        toast.success('Movimentação atualizada com sucesso!');
      } else {
        // MODO CRIAÇÃO
        if (tipo === 'ENTRADA') {
          const stockId = await usedItemsService.registerEntry(
            fazendaId,
            produtoId,
            Number(quantidade),
            unidadeMedida,
            marca,
            user.id
          );

          if (foto && stockId) {
            await usedItemsService.uploadStockPhoto(stockId, foto);
          }
          
          toast.success('Entrada registrada com sucesso!');
        } else {
          if (!equipamentoDestino) {
            toast.error('Informe o equipamento de destino');
            setIsSubmitting(false);
            return;
          }

          await usedItemsService.registerExit(
            fazendaId,
            produtoId,
            Number(quantidade),
            equipamentoDestino,
            user.id
          );
          toast.success('Saída registrada com sucesso!');
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar movimentação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProdutoId('');
    setQuantidade('');
    setUnidadeMedida('UN');
    setMarca('');
    setEquipamentoDestino('');
    setFoto(null);
    setFotoPreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Tipo de Movimentação */}
          <div className={`flex gap-2 p-1 bg-slate-100 rounded-xl ${editingTransaction ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <button
              type="button"
              disabled={!!editingTransaction}
              onClick={() => { setTipo('ENTRADA'); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                tipo === 'ENTRADA' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownRight size={18} /> Entrada de Peça
            </button>
            <button
              type="button"
              disabled={!!editingTransaction}
              onClick={() => { setTipo('SAIDA'); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                tipo === 'SAIDA' ? 'bg-white text-rose-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpRight size={18} /> Saída (Aplicação)
            </button>
          </div>

          <div className="space-y-4">
            <div className={`relative ${editingTransaction ? 'opacity-60' : ''}`} ref={dropdownRef}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Item (Produto) <span className="text-red-500">*</span>
              </label>
              
              <div 
                className={`w-full px-4 py-2.5 bg-slate-50 border ${isDropdownOpen ? 'border-teal-500 ring-2 ring-teal-500' : 'border-slate-200'} rounded-xl text-sm ${editingTransaction ? 'cursor-not-allowed' : 'cursor-pointer'} flex justify-between items-center`}
                onClick={() => !isSubmitting && !editingTransaction && setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={produtoId ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                  {selectedProductName || 'Selecione o item...'}
                </span>
                {!editingTransaction && <Search size={16} className="text-slate-400" />}
              </div>

              {isDropdownOpen && !editingTransaction && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60">
                  <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                    <input
                      type="text"
                      placeholder="Buscar item..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto">
                    {tipo === 'ENTRADA' ? (
                      filteredCatalog.length > 0 ? (
                        filteredCatalog.map(c => (
                          <div
                            key={c.id}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center"
                            onClick={() => {
                              setProdutoId(c.id);
                              setIsDropdownOpen(false);
                              setSearchTerm('');
                            }}
                          >
                            <div className="flex flex-col">
                                <span className="font-medium">{c.nome}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  CÓD: {c.codigo_item ? String(c.codigo_item).padStart(5, '0') : '-'}
                                </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-500 mb-3">Item não encontrado.</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCatalogModalOpen(true);
                              setIsDropdownOpen(false);
                            }}
                            className="text-teal-600 text-sm font-bold flex items-center justify-center gap-1 w-full p-2 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                          >
                            <Plus size={16} /> Cadastrar "{searchTerm}"
                          </button>
                        </div>
                      )
                    ) : (
                      filteredExitStock.length > 0 ? (
                        filteredExitStock.map(s => (
                          <div
                            key={s.id}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 flex justify-between items-center"
                            onClick={() => {
                              setProdutoId(s.produto_id);
                              setIsDropdownOpen(false);
                              setSearchTerm('');
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{s.produto?.nome}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                CÓD: {s.produto?.codigo_item ? String(s.produto.codigo_item).padStart(5, '0') : '-'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">
                              Saldo: {s.quantidade}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-slate-500">
                          Nenhuma peça com saldo disponível encontrada.
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`grid ${tipo === 'ENTRADA' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  placeholder="Ex: 2"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                  disabled={isSubmitting}
                />
              </div>

              {tipo === 'ENTRADA' && (
                <>
                  <div className={editingTransaction ? 'opacity-60 cursor-not-allowed' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Unidade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={unidadeMedida}
                      onChange={(e) => setUnidadeMedida(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                      disabled={isSubmitting || !!editingTransaction}
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="M">Metro (M)</option>
                      <option value="L">Litro (L)</option>
                      <option value="KG">Quilograma (KG)</option>
                      <option value="CX">Caixa (CX)</option>
                      <option value="PC">Peça (PC)</option>
                      <option value="GL">Galão (GL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      placeholder="Ex: Michelin"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
            </div>

            {tipo === 'SAIDA' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Equipamento Destino <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={equipamentoDestino}
                  onChange={(e) => setEquipamentoDestino(e.target.value)}
                  required
                  placeholder="Ex: Trator JD 7J - Frota 123"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Foto Input - Só mostra no modo criação de entrada */}
            {tipo === 'ENTRADA' && !editingTransaction && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Foto da Peça Usada (Opcional)
                </label>
                
                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40">
                    <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 bg-white/80 backdrop-blur text-rose-600 p-1.5 rounded-lg hover:bg-white hover:text-rose-700 transition-colors shadow-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-teal-400 hover:text-teal-600 transition-colors cursor-pointer"
                  >
                    <Camera size={32} className="mb-2" />
                    <span className="text-sm font-medium">Clique para anexar ou tirar foto</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG até 5MB</span>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !produtoId || !quantidade || (tipo === 'SAIDA' && !equipamentoDestino)}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm ${
              tipo === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {editingTransaction ? 'Salvar Alterações' : (tipo === 'ENTRADA' ? 'Salvar Entrada' : 'Salvar Saída')}
          </button>
        </div>
      </div>

      {/* Modal Embutido para Cadastrar Item Rápido */}
      {!editingTransaction && (
        <UsedItemCatalogModal
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          onSuccess={() => {
            onSuccess();
            setIsCatalogModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
