import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { utils, read } from 'xlsx';
import { Upload, FileSpreadsheet, Save, Image as ImageIcon, Search, Boxes, ArrowLeft, X, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { stockService } from '../services/stockService';
import { StockHistoryModal } from '../components/StockHistoryModal';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import type { Material } from '../types';
// import { format } from 'date-fns'; // Unused in this version
// import { supabase } from '../lib/supabase'; // Unused direct usage
import { useAuth } from '../context/AuthContext';

interface ImportItem {
    code: string;
    name: string;
    group: string;
    subGroup: string;
    unit: string;
    stock: number;
    status: 'PENDING' | 'FOUND' | 'NEW' | 'ERROR';
    matchId?: string;
    currentDbStock?: number;
}

export function StockImport() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { hasPermission, checkAccess } = useAuth();
    const canEdit = checkAccess({ module: 'gestao_estoque', action: 'edit' });

    // View State: 'LIST' or 'IMPORT'
    const [viewMode, setViewMode] = useState<'LIST' | 'IMPORT'>('LIST');

    // List State
    const [dbMaterials, setDbMaterials] = useState<Material[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Import State
    const [items, setItems] = useState<ImportItem[]>([]);
    // const [fileName, setFileName] = useState<string | null>(null); // Unused
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'FINISH'>('UPLOAD');

    const [imageUploadItem, setImageUploadItem] = useState<{ id: string, name: string, code: string } | null>(null);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [selectedMaterialHistory, setSelectedMaterialHistory] = useState<Material | null>(null);

    // --- Load Data (List Mode) ---
    useEffect(() => {
        if (viewMode === 'LIST') {
            loadMaterials();
        }
    }, [viewMode, searchTerm]);

    const loadMaterials = async () => {
        setLoadingList(true);
        try {
            const data = await stockService.getMaterials(searchTerm);
            setDbMaterials(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingList(false);
        }
    };

    // --- File Handling ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        // setFileName(file.name);
        setViewMode('IMPORT'); // Switch to import view automatically
        setStep('REVIEW'); // Jump to review if parse is successful

        try {
            const data = await file.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // 1. Convert to array of arrays to find the header row
            const rawData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // 2. Find the row index that contains "Código"
            let headerRowIndex = 0;
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                if (row.some((cell: any) => cell && String(cell).toLowerCase().includes('código') || String(cell).toLowerCase().includes('codigo'))) {
                    headerRowIndex = i;
                    break;
                }
            }

            // 3. Parse again using proper range
            const jsonData = utils.sheet_to_json(worksheet, { range: headerRowIndex });

            const parsedItems: ImportItem[] = [];
            const productRows = jsonData as any[];

            // 1. Extract all codes to do a SINGLE validation query
            const allCodes = Array.from(new Set(productRows
                .map(row => String(row['Código'] || row['Codigo'] || row['codigo'] || '').trim())
                .filter(Boolean)
            ));

            // 2. Fetch all existing materials for these codes
            const existingMaterials = await stockService.getMaterialsByCodes(allCodes);
            const materialMap = new Map(existingMaterials.map(m => [m.unisystem_code, m]));

            // 3. Process items using the map (zero extra network calls)
            for (const row of productRows) {
                const code = String(row['Código'] || row['Codigo'] || row['codigo'] || '').trim();
                if (!code) continue;

                const name = String(row['Descrição Produto'] || row['Descricao'] || row['Produto'] || '').trim();
                const group = String(row['Grupo'] || '').trim();
                const subGroup = String(row['Sub Grupo'] || row['SubGrupo'] || '').trim();
                const unit = String(row['Unidade'] || 'UN').trim();
                const stock = Number(row['Saldo'] || row['Estoque'] || 0);

                const existing = materialMap.get(code);

                parsedItems.push({
                    code,
                    name,
                    group,
                    subGroup,
                    unit,
                    stock,
                    status: existing ? 'FOUND' : 'NEW',
                    matchId: existing?.id,
                    currentDbStock: existing?.current_stock
                });
            }

            setItems(parsedItems);
        } catch (err) {
            console.error(err);
            alert('Erro ao ler arquivo. Verifique se é um Excel válido.');
            setStep('UPLOAD');
        } finally {
            setLoading(false);
        }
    };

    const handleImportConfirm = async () => {
        if (!confirm(`Confirma a importação de ${items.length} itens ? `)) return;

        setProcessing(true);
        try {
            let updated = 0;
            let created = 0;

            for (const item of items) {
                const payload = {
                    name: item.name,
                    unisystem_code: item.code,
                    group_name: item.group,
                    sub_group: item.subGroup,
                    unit: item.unit,
                    current_stock: item.stock,
                    active: true,
                    updated_at: new Date().toISOString()
                };

                if (item.matchId) {
                    await stockService.upsertMaterial({ ...payload, id: item.matchId });
                    updated++;
                } else {
                    await stockService.upsertMaterial(payload);
                    created++;
                }
            }

            alert(`Importação Concluída!\n\nNovos: ${created} \nAtualizados: ${updated} `);
            setStep('FINISH');
            setItems([]);
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            setViewMode('LIST'); // Return to list view
            loadMaterials();

        } catch (err: any) {
            console.error(err);
            alert(`Erro na importação: ${err.message} `);
        } finally {
            setProcessing(false);
        }
    };

    // --- Image Upload ---

    const handleImageUpload = async (file: File) => {
        if (!imageUploadItem) return;

        try {
            const path = `products / ${imageUploadItem.code}_${Date.now()} `;
            const url = await stockService.uploadMaterialImage(file, path);

            // Use UPDATE instead of UPSERT to avoid "not-null" constraint issues if it tries to insert
            await stockService.updateMaterial(imageUploadItem.id, { image_url: url });

            alert("Imagem enviada!");
            setImageUploadItem(null);

            // Reload list to show new image
            if (viewMode === 'LIST') {
                setDbMaterials(prev => prev.map(m => m.id === imageUploadItem.id ? { ...m, image_url: url } : m));
            }

        } catch (err: any) {
            alert("Erro ao enviar imagem: " + err.message);
        }
    };

    if (!hasPermission('gestao_estoque')) {
        return (
            <div className="p-8 text-center max-w-7xl mx-auto">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Restrito</h2>
                    <p className="text-red-600">Você não tem permissão para visualizar a Gestão de Estoque. Contate um administrador.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-6">
            <PageHeader
                title={viewMode === 'LIST' ? "Gestão de Estoque" : "Importação de Estoque"}
                subtitle={viewMode === 'LIST' ? "Consulte e gerencie os materiais do sistema" : "Importe itens via Excel (Unisystem)"}
                icon={FileSpreadsheet}
            >
                {viewMode === 'LIST' ? (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ultima Importação</span>
                            <span className="text-xs font-bold text-slate-600">
                                {dbMaterials.length > 0
                                    ? new Date(Math.max(...dbMaterials.map(m => new Date(m.updated_at || 0).getTime()))).toLocaleString('pt-BR')
                                    : '-'}
                            </span>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || processing}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md transition-colors"
                            >
                                <Upload size={20} /> Carregar Excel
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => setViewMode('LIST')}
                        className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} /> Voltar para Lista
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </PageHeader>

            {/* --- LIST MODE --- */}
            {viewMode === 'LIST' && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar material por nome ou código..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loadingList ? (
                        <TableSkeleton rows={10} columns={7} showActions={true} />
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {dbMaterials.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50">
                                    <Boxes size={48} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-slate-500 font-medium">Nenhum material cadastrado.</p>
                                    {canEdit && <p className="text-slate-400 text-sm">Clique em "Carregar Excel" para importar sua planilha.</p>}
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3 text-center">Foto</th>
                                            <th className="px-6 py-3">Código</th>
                                            <th className="px-6 py-3">Descrição</th>
                                            <th className="px-6 py-3">Grupo</th>
                                            <th className="px-6 py-3 text-center">Última Saída</th>
                                            <th className="px-6 py-3 text-right">Estoque Atual</th>
                                            <th className="px-6 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dbMaterials.map((material) => (
                                            <tr
                                                key={material.id}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                    // Ignore if clicked on specific action buttons or image
                                                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.cursor-zoom-in')) return;
                                                    setSelectedMaterialHistory(material);
                                                }}
                                            >
                                                <td className="px-6 py-3 text-center">
                                                    <div className="flex justify-center">
                                                        {material.image_url ? (
                                                            <div
                                                                className="w-10 h-10 rounded shrink-0 overflow-hidden border border-slate-100 shadow-sm cursor-zoom-in"
                                                                onClick={() => setExpandedImage(material.image_url || null)}
                                                            >
                                                                <img src={material.image_url} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-300"><Boxes size={20} /></div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 font-mono text-slate-600">{material.unisystem_code}</td>
                                                <td className="px-6 py-3 font-medium text-slate-800">{material.name}</td>
                                                <td className="px-6 py-3 text-slate-500">
                                                    {material.group_name} <span className="text-xs text-slate-400">/ {material.sub_group}</span>
                                                </td>
                                                <td className="px-6 py-3 text-center text-xs text-slate-500">
                                                    {material.last_exit_date ? new Date(material.last_exit_date).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                    {material.current_stock} <span className="text-[10px] font-normal text-slate-400">{material.unit}</span>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    {canEdit ? (
                                                        <button
                                                            onClick={() => setImageUploadItem({ id: material.id, name: material.name, code: material.unisystem_code || '' })}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded transition-colors"
                                                            title="Alterar Foto"
                                                        >
                                                            <ImageIcon size={16} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- IMPORT MODE --- */}
            {viewMode === 'IMPORT' && (
                <div className="space-y-4">
                    {/* Reuse existing import UI logic here */}
                    {step === 'UPLOAD' && (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500">
                            <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2">Editor de Importação</h3>
                            <p className="text-sm">Carregue a planilha para visualizar o pré-processamento.</p>
                        </div>
                    )}

                    {step === 'REVIEW' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                                <div className="flex gap-6">
                                    <div>
                                        <span className="block text-xs text-slate-400 font-bold uppercase">Itens Lidos</span>
                                        <span className="text-xl font-bold text-slate-700">{items.length}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-400 font-bold uppercase">Novos</span>
                                        <span className="text-xl font-bold text-green-600">
                                            {items.filter(i => i.status === 'NEW').length}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-400 font-bold uppercase">Atualizações</span>
                                        <span className="text-xl font-bold text-blue-600">
                                            {items.filter(i => i.status === 'FOUND').length}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewMode('LIST')}
                                        className="text-slate-500 px-4 py-3 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleImportConfirm}
                                        disabled={processing}
                                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
                                    >
                                        {processing ? 'Importando...' : 'Confirmar Importação'}
                                        <Save size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Código</th>
                                            <th className="px-6 py-3">Descrição</th>
                                            <th className="px-6 py-3">Grupo</th>
                                            <th className="px-6 py-3 text-right">Saldo Atual (DB)</th>
                                            <th className="px-6 py-3 text-right">Novo Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3">
                                                    {item.status === 'NEW' ? (
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">NOVO</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">ATUALIZAR</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 font-mono text-slate-600">{item.code}</td>
                                                <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                                                <td className="px-6 py-3 text-slate-500">
                                                    {item.group} <span className="text-xs text-slate-400">/ {item.subGroup}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right text-slate-400">
                                                    {item.currentDbStock !== undefined ? item.currentDbStock : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                    {item.stock} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Image Upload Modal */}
            {imageUploadItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
                        <h3 className="text-xl font-bold mb-1">Adicionar Foto</h3>
                        <p className="text-sm text-slate-500 mb-6">Produto: <strong>{imageUploadItem.name}</strong></p>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors cursor-pointer text-center relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="pointer-events-none">
                                <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                                <span className="text-sm text-blue-600 font-medium">Clique para escolher</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setImageUploadItem(null)}
                            className="mt-6 w-full py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Image Expansion Modal */}
            {expandedImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-8 animate-in fade-in duration-200"
                    onClick={() => setExpandedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        onClick={() => setExpandedImage(null)}
                    >
                        <X size={48} />
                    </button>
                    <img
                        src={expandedImage}
                        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <StockHistoryModal
                material={selectedMaterialHistory}
                onClose={() => setSelectedMaterialHistory(null)}
            />

        </div>
    );
}
