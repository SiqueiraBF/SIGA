import { useState, useEffect } from 'react';
import { Building2, Search, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { Supplier } from '../types';
import { supplierService } from '../services/supplierService';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import toast from 'react-hot-toast';

export function SupplierManager() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const data = await supplierService.getAll();
            setSuppliers(data);
        } catch (error) {
            toast.error('Erro ao buscar fornecedores.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (supplier?: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(undefined);
    };

    const handleSuccessToggle = async (supplierId: string, currentStatus: boolean) => {
        try {
            await supplierService.toggleActive(supplierId, currentStatus);
            toast.success(`Fornecedor ${currentStatus ? 'bloqueado' : 'ativado'} com sucesso!`);
            loadSuppliers(); // refresh
        } catch (error) {
            toast.error('Erro ao alterar status.');
        }
    };

    const filteredSuppliers = suppliers.filter(s => {
        const search = searchTerm.toLowerCase();
        return (
            s.razao_social.toLowerCase().includes(search) ||
            s.cnpj.includes(search) ||
            (s.nome_fantasia && s.nome_fantasia.toLowerCase().includes(search))
        );
    });

    const activeCount = suppliers.filter(s => s.ativo).length;
    const inactiveCount = suppliers.length - activeCount;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-6 bg-slate-50 overflow-hidden animate-in fade-in duration-300">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" /> Histórico de Fornecedores
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Cadastros Mestre de Pessoas Jurídicas</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Ativos</span>
                            <span className="text-sm font-bold text-slate-700">{activeCount}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Bloqueados</span>
                            <span className="text-sm font-bold text-slate-700">{inactiveCount}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 active:scale-95 ml-2"
                    >
                        <Plus size={18} /> Novo Fornecedor
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex gap-4 shrink-0 bg-slate-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Razão, Fantasia ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[180px]">CNPJ</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Razão Social</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Fantasia</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px] text-center">Status</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">Buscando fornecedores...</td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">Nenhum fornecedor encontrado.</td>
                                </tr>
                            ) : (
                                filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600 font-medium">{supplier.cnpj}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-800 text-sm uppercase">{supplier.razao_social}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 text-sm uppercase">{supplier.nome_fantasia || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleSuccessToggle(supplier.id, supplier.ativo)}
                                                title={supplier.ativo ? 'Bloquear Integrante' : 'Desbloquear Integrante'}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${
                                                    supplier.ativo 
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                                                }`}
                                            >
                                                {supplier.ativo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                {supplier.ativo ? 'Ativo' : 'Bloqueado'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenModal(supplier)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            <SupplierFormModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={loadSuppliers}
                initialData={selectedSupplier}
            />
        </div>
    );
}
