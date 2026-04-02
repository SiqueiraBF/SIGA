import React from 'react';
import { Plus, Search, DollarSign, Upload, CheckCircle, AlertTriangle, Building2, User, Pencil } from 'lucide-react';
import { UnisystemSupplier } from '../../types/invoiceTypes';

interface InvoiceSidePanelProps {
    invoiceNumber: string;
    setInvoiceNumber: (val: string) => void;
    supplierName: string;
    setSupplierName: (val: string) => void;
    supplierCnpj?: string;
    issueDate: string;
    setIssueDate: (val: string) => void;
    deliveryDate: string;
    setDeliveryDate: (val: string) => void;
    amount: string;
    setAmount: (val: string) => void;
    file: File | null;
    handleFileUpload: (file: File) => void;
    handleAddItem: (e: React.FormEvent) => void;
    validateDuplicate: () => void;
    status: 'valid' | 'invalid' | 'checking' | 'duplicate';
    errorMsg?: string;
    activeSearchRow: boolean;
    setActiveSearchRow: (val: boolean) => void;
    suggestions: UnisystemSupplier[];
    handleSelectSupplier: (s: UnisystemSupplier) => void;
    currentFarm: string;
    userName: string;
    isEditMode?: boolean;
    isSubmitting?: boolean;
}

export const InvoiceSidePanel: React.FC<InvoiceSidePanelProps> = ({
    invoiceNumber, setInvoiceNumber,
    supplierName, setSupplierName,
    supplierCnpj,
    issueDate, setIssueDate,
    deliveryDate, setDeliveryDate,
    amount, setAmount,
    file, handleFileUpload,
    handleAddItem,
    validateDuplicate,
    status, errorMsg,
    activeSearchRow, setActiveSearchRow,
    suggestions,
    handleSelectSupplier,
    currentFarm,
    userName,
    isEditMode,
    isSubmitting
}) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileUpload(droppedFile);
        }
    };

    return (
        <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
                
                {/* Context Info */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <Building2 size={16} className="text-slate-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">FILIAL / FAZENDA</label>
                            <span className="text-sm font-bold text-slate-700">{currentFarm}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <User size={16} className="text-slate-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">USUÁRIO LOGADO</label>
                            <span className="text-sm font-bold text-slate-700">{userName}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isEditMode ? <Pencil size={12} className="text-blue-500" /> : <Plus size={12} className="text-blue-500" />} {isEditMode ? 'Editar Detalhes' : 'Detalhes da NF'}
                </div>

                <form onSubmit={handleAddItem} className="space-y-4">
                    {/* Número NF */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">NOTA FISCAL</label>
                        <input
                            type="text"
                            required
                            disabled={isSubmitting}
                            placeholder="000.000"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            onBlur={validateDuplicate}
                            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-700 text-sm font-bold focus:ring-2 outline-none transition-all disabled:opacity-50 ${
                                status === 'duplicate' ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500 focus:bg-white'
                            }`}
                        />
                        {status === 'duplicate' && (
                            <span className="text-[10px] text-red-600 font-bold mt-1 ml-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                                <AlertTriangle size={10} /> {errorMsg}
                            </span>
                        )}
                        {status === 'checking' && (
                            <span className="text-[10px] text-blue-600 font-bold mt-1 ml-1 animate-pulse flex items-center gap-1">
                                Verificando duplicidade...
                            </span>
                        )}
                    </div>

                    {/* Fornecedor */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Fornecedor</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                required
                                disabled={isSubmitting}
                                placeholder="Buscar fornecedor..."
                                value={supplierName}
                                onChange={(e) => {
                                    setSupplierName(e.target.value);
                                    setActiveSearchRow(true);
                                }}
                                onFocus={() => setActiveSearchRow(true)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                            />
                        </div>

                        {/* Suggestions List */}
                        {activeSearchRow && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in slide-in-from-top-1">
                                {suggestions.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleSelectSupplier(s)}
                                        className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <div className="text-sm font-black text-slate-700 uppercase">{s.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400">CNPJ: {s.cnpj}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {supplierCnpj && (
                            <div className="text-[10px] text-green-600 font-bold mt-1 ml-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                                <CheckCircle size={10} /> CNPJ: {supplierCnpj}
                            </div>
                        )}
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Emissão</label>
                            <input
                                type="date"
                                required
                                disabled={isSubmitting}
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">RECEBIMENTO</label>
                            <input
                                type="date"
                                required
                                disabled={isSubmitting}
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Valor */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">VALOR DA NOTA (R$)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                                type="number"
                                step="0.01"
                                disabled={isSubmitting}
                                placeholder="0,00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Upload */}
                    {!isEditMode && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Anexo (Foto/PDF)</label>
                            <input
                                type="file"
                                id="invoice-file-upload"
                                className="hidden"
                                disabled={isSubmitting}
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            />
                            <label
                                htmlFor="invoice-file-upload"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center gap-2 w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                    file 
                                        ? 'bg-green-50 border-green-300' 
                                        : isDragging
                                            ? 'bg-blue-50 border-blue-400 scale-[1.02] shadow-md'
                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                            >
                                {file ? (
                                    <>
                                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                                            <CheckCircle size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-green-700 uppercase truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-[9px] font-bold text-green-600 uppercase">Clique para trocar</span>
                                    </>
                                ) : (
                                    <>
                                        <div className={`p-2 rounded-full shadow-sm transition-all ${isDragging ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-white text-slate-400'}`}>
                                            <Upload size={20} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase ${isDragging ? 'text-blue-700' : 'text-slate-400'}`}>
                                            {isDragging ? 'Solte para anexar' : 'Selecionar arquivo'}
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}>
                                            PDF ou Imagem
                                        </span>
                                    </>
                                )}
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || status === 'duplicate'}
                        className="w-full py-3.5 bg-slate-800 text-white font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-slate-900 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">PROCESSANDO...</span>
                        ) : (
                            <>
                                {isEditMode ? <CheckCircle size={16} /> : <Plus size={16} />}
                                {isEditMode ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR NOTA'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
