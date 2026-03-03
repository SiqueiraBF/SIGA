import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { CleaningFormModal } from '../components/cleaning/CleaningFormModal';
import { CleaningDetailsModal } from '../components/cleaning/CleaningDetailsModal';
import { CleaningEmailSettingsModal } from '../components/cleaning/CleaningEmailSettingsModal';
import { CleaningFarmSettingsModal } from '../components/cleaning/CleaningFarmSettingsModal';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { cleaningService, CleaningRegistry } from '../services/cleaningService';
import { useAuth } from '../context/AuthContext';
import {
    Sparkles,
    Plus,
    Calendar,
    MapPin,
    Filter,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    User,
    ImageIcon,
    Settings,
    Mail,
    AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CleaningList() {
    const { user, role, hasPermission, checkAccess } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const canEdit = checkAccess({ module: 'gestao_limpeza', action: 'edit' });
    const viewScope = role?.permissoes?.gestao_limpeza?.view_scope || 'NONE';
    const canViewAll = isAdmin || viewScope === 'ALL';

    const [registries, setRegistries] = useState<CleaningRegistry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRegistry, setSelectedRegistry] = useState<CleaningRegistry | null>(null);

    // KPI State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);

    // KPI State
    const [weeklyStatus, setWeeklyStatus] = useState<{ almoxarifado: boolean; posto: boolean } | null>(null);
    const [allFarmsStatus, setAllFarmsStatus] = useState<{ id: string; nome: string; almoxarifadoDate: string | null; postoDate: string | null }[]>([]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Load History
            const queryParams = canViewAll ? {} : { fazenda_id: user.fazenda_id };
            const data = await cleaningService.getCleanings(queryParams);
            setRegistries(data);

            // Load KPI
            if (canViewAll) {
                const status = await cleaningService.getAllFarmsWeeklyStatus();
                setAllFarmsStatus(status);
            } else if (user.fazenda_id) {
                const status = await cleaningService.getWeeklyStatus(user.fazenda_id);
                setWeeklyStatus(status);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const StatusCard = ({ title, day, isDone }: { title: string; day: string; isDone: boolean }) => (
        <div className={`p-4 rounded-xl border ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'} shadow-sm flex items-center justify-between`}>
            <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">{day}</span>
                <h3 className={`font-bold text-lg ${isDone ? 'text-green-700' : 'text-slate-700'}`}>{title}</h3>
                <p className={`text-sm ${isDone ? 'text-green-600' : 'text-slate-400'}`}>
                    {isDone ? 'Concluído esta semana' : 'Pendente de registro'}
                </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDone ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {isDone ? <CheckCircle size={20} /> : <Clock size={20} />}
            </div>
        </div>
    );

    const renderStatusCell = (dateString: string | null) => {
        if (!dateString) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                    <Clock size={12} className="mr-1" /> Pendente
                </span>
            );
        }

        const dateObj = new Date(dateString + 'T12:00:00');
        const daysDiff = differenceInDays(new Date(), dateObj);

        if (daysDiff > 7) {
            return (
                <div className="flex flex-col items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 mb-1">
                        <AlertTriangle size={12} className="mr-1" /> Atrasado ({daysDiff} dias)
                    </span>
                    <span className="text-xs text-red-500 font-bold">
                        {format(dateObj, "dd/MM/yyyy")}
                    </span>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                    <CheckCircle size={12} className="mr-1" /> Realizado
                </span>
                <span className="text-xs text-slate-400">
                    {format(dateObj, "dd/MM/yyyy")}
                </span>
            </div>
        );
    };

    const AdminStatusTable = () => (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700">Status por Fazenda</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-medium">Fazenda</th>
                            <th className="px-6 py-3 font-medium text-center">Almoxarifado</th>
                            <th className="px-6 py-3 font-medium text-center">Posto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allFarmsStatus.map((farm) => (
                            <tr key={farm.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-800">{farm.nome}</td>
                                <td className="px-6 py-4 text-center">
                                    {renderStatusCell(farm.almoxarifadoDate)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {renderStatusCell(farm.postoDate)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const filteredRegistries = registries.filter(r => {
        const matchesSearch =
            r.fazenda?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.usuario?.nome.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter ? r.tipo === typeFilter : true;

        return matchesSearch && matchesType;
    });

    if (!hasPermission('gestao_limpeza')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar a Limpeza e Organização.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Limpeza e Organização"
                subtitle="Registro semanal de organização do Almoxarifado e Posto"
                icon={Sparkles}
            >
                <div className="flex gap-2">
                    {(isAdmin || role?.permissoes?.gestao_limpeza?.manage_notifications) && (
                        <div className="relative group">
                            <button className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                <Settings size={20} />
                            </button>
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-20">
                                <button
                                    onClick={() => setIsEmailModalOpen(true)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-600 flex items-center gap-2"
                                >
                                    <Mail size={16} /> Configurar E-mails
                                </button>
                                <button
                                    onClick={() => setIsFarmModalOpen(true)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-600 flex items-center gap-2"
                                >
                                    <MapPin size={16} /> Fazendas Monitoradas
                                </button>
                            </div>
                        </div>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus size={20} /> Novo Registro
                        </button>
                    )}
                </div>
            </PageHeader>

            {loading ? (
                <div className="space-y-6">
                    <StatsSkeleton count={canViewAll ? 1 : 2} />
                    <TableSkeleton rows={5} columns={4} showActions={false} />
                </div>
            ) : (
                <>
                    {/* KPI Section */}
                    {canViewAll ? (
                        <AdminStatusTable />
                    ) : (
                        user?.fazenda_id && weeklyStatus && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <StatusCard
                                    title="Almoxarifado"
                                    day="Segunda-feira"
                                    isDone={weeklyStatus.almoxarifado}
                                />
                                <StatusCard
                                    title="Posto de Abastecimento"
                                    day="Sexta-feira"
                                    isDone={weeklyStatus.posto}
                                />
                            </div>
                        )
                    )}

                    {/* Filters */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por fazenda ou usuário..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Todos os Tipos</option>
                            <option value="ALMOXARIFADO">Almoxarifado</option>
                            <option value="POSTO">Posto</option>
                        </select>
                    </div>

                    {/* List */}
                    {filteredRegistries.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
                            <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="font-bold text-slate-600">Nenhum registro encontrado</h3>
                            <p className="text-slate-400 text-sm">Clique em "Novo Registro" para começar.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRegistries.map(registry => (
                                <div
                                    key={registry.id}
                                    onClick={() => setSelectedRegistry(registry)}
                                    className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${registry.tipo === 'ALMOXARIFADO' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {registry.tipo}
                                                </span>
                                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                                    <Calendar size={12} /> {format(new Date(registry.data + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                {registry.fazenda?.nome}
                                            </h3>
                                            <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                                                <User size={14} /> {registry.usuario?.nome}
                                            </p>
                                        </div>

                                        {registry.fotos && registry.fotos.length > 0 && (
                                            <div className="flex -space-x-3">
                                                {registry.fotos.slice(0, 3).map((foto, idx) => (
                                                    <div key={idx} className="w-12 h-12 rounded-lg border-2 border-white bg-slate-100 overflow-hidden relative shadow-sm">
                                                        <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                                {registry.fotos.length > 3 && (
                                                    <div className="w-12 h-12 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                                                        +{registry.fotos.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {registry.observacoes && (
                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100">
                                            <span className="font-bold text-slate-700">Observação:</span> {registry.observacoes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <CleaningFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
            />

            <CleaningDetailsModal
                isOpen={!!selectedRegistry}
                onClose={() => setSelectedRegistry(null)}
                registry={selectedRegistry}
                onDeleteSuccess={loadData}
            />

            {isEmailModalOpen && (
                <CleaningEmailSettingsModal onClose={() => setIsEmailModalOpen(false)} />
            )}

            {isFarmModalOpen && (
                <CleaningFarmSettingsModal onClose={() => setIsFarmModalOpen(false)} />
            )}
        </div>
    );
}
