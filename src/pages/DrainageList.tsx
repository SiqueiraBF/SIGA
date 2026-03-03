
import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Filter, Calendar, MapPin, ImageIcon, HelpCircle, Search, User, X, Settings as SettingsIcon, CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { FilterBar } from '../components/ui/FilterBar';
import { PageHeader } from '../components/ui/PageHeader';
import StatsCard from '../components/ui/StatsCard';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { StatsSkeleton } from '../components/ui/StatsSkeleton';
import { useAuth } from '../context/AuthContext';
import { drainageService, StationDrainage } from '../services/drainageService';
import { farmService } from '../services/farmService';
import { stationService } from '../services/stationService';
import { userService } from '../services/userService';

import { DrainageFormModal } from '../components/drainage/DrainageFormModal';
import { DrainageDetailsModal } from '../components/drainage/DrainageDetailsModal';
import { DrainageTutorialModal } from '../components/drainage/DrainageTutorialModal';
import { DrainageBatchFormModal } from '../components/drainage/DrainageBatchFormModal';
import { DrainageEmailSettingsModal } from '../components/drainage/DrainageEmailSettingsModal';
import { format, parseISO } from 'date-fns';

export function DrainageList() {
    const { user, role, hasPermission, checkAccess } = useAuth();
    const isAdmin = role?.nome === 'Administrador' || (user as any)?.funcao === 'Administrador';
    const canEdit = checkAccess({ module: 'gestao_drenagem', action: 'edit' });
    const viewScope = role?.permissoes?.gestao_drenagem?.view_scope || 'NONE';
    const canViewAll = isAdmin || viewScope === 'ALL';
    const [loading, setLoading] = useState(true);
    const [drainages, setDrainages] = useState<StationDrainage[]>([]);
    const [viewDrainages, setViewDrainages] = useState<StationDrainage[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [selectedDrainage, setSelectedDrainage] = useState<StationDrainage | null>(null);

    // Filters State
    const [fazendaId, setFazendaId] = useState('');
    const [postoId, setPostoId] = useState('');
    const [usuarioId, setUsuarioId] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [searchText, setSearchText] = useState('');

    // Data for dropdowns
    const [fazendas, setFazendas] = useState<any[]>([]);
    const [postos, setPostos] = useState<any[]>([]);
    const [usuarios, setUsuarios] = useState<any[]>([]);

    const loadRequestId = React.useRef(0);

    // Initial Load
    useEffect(() => {
        if (user) {
            loadFilterData();
            loadData();
        }
    }, [user]);

    // Derived Filters
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [fazendaId, postoId, usuarioId, dataInicio, dataFim]);

    // Dependent Filters
    useEffect(() => {
        setPostoId('');
        if (fazendaId) {
            loadStations(fazendaId);
        } else {
            setPostos([]);
        }
    }, [fazendaId]);

    // Client-side Search
    useEffect(() => {
        if (searchText.trim() === '') {
            setViewDrainages(drainages);
        } else {
            const lowerSearch = searchText.toLowerCase();
            const filtered = drainages.filter(d =>
                (d.posto?.nome || '').toLowerCase().includes(lowerSearch) ||
                (d.usuario?.nome || '').toLowerCase().includes(lowerSearch)
            );
            setViewDrainages(filtered);
        }
    }, [searchText, drainages]);

    async function loadFilterData() {
        try {
            const [fazendasData, usersData] = await Promise.all([
                drainageService.getDistinctFarms(),
                drainageService.getDistinctUsers()
            ]);
            setFazendas(fazendasData);
            setUsuarios(usersData);
        } catch (error) {
            console.error("Erro ao carregar dados de filtro:", error);
        }
    }

    async function loadStations(fazendaId: string) {
        try {
            const data = await stationService.getStations(fazendaId, true);
            setPostos(data);
        } catch (error) {
            console.error("Erro ao carregar postos:", error);
        }
    }

    async function loadData() {
        const requestId = ++loadRequestId.current;
        setLoading(true);
        try {
            const filters: any = {};

            // Enforce view scope
            if (!canViewAll && user?.fazenda_id) {
                filters.fazenda_id = user.fazenda_id;
            } else if (fazendaId) {
                filters.fazenda_id = fazendaId;
            }
            if (postoId) filters.posto_id = postoId;
            if (usuarioId) filters.usuario_id = usuarioId;
            if (dataInicio) filters.dataInicio = dataInicio;
            if (dataFim) filters.dataFim = dataFim;

            const data = await drainageService.getDrainages(filters);

            if (requestId === loadRequestId.current) {
                setDrainages(data);
                setLoading(false);
            }
        } catch (error) {
            console.error('Erro ao carregar drenagens:', error);
            if (requestId === loadRequestId.current) {
                setLoading(false);
            }
        }
    }

    const clearFilters = () => {
        setFazendaId('');
        setPostoId('');
        setUsuarioId('');
        setDataInicio('');
        setDataFim('');
        setSearchText('');
    };

    const totalDrainages = viewDrainages.length;
    const totalLitros = viewDrainages.reduce((sum, d) => sum + d.litros_drenados, 0);

    if (!hasPermission('gestao_drenagem')) {
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                    <p className="text-red-600">Você não tem permissão para acessar a Drenagem de Postos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Drenagem de Postos"
                subtitle="Gerencie as aferições e drenagens dos tanques"
                icon={Droplet}
            >
                {(isAdmin || role?.permissoes?.gestao_drenagem?.manage_notifications) && (
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
                        title="Configurar Notificações"
                    >
                        <SettingsIcon size={20} />
                    </button>
                )}
                <button
                    onClick={() => setIsTutorialOpen(true)}
                    className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
                    title="Como funciona?"
                >
                    <HelpCircle size={20} />
                </button>
                {canEdit && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Nova Drenagem</span>
                    </button>
                )}
            </PageHeader>

            {loading ? (
                <div className="space-y-6">
                    <StatsSkeleton count={3} />
                    <TableSkeleton rows={8} columns={6} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatsCard
                            title="TOTAL DRENAGENS"
                            value={totalDrainages}
                            icon={Droplet}
                            description="Registros lançados"
                            variant="blue"
                        />
                        <StatsCard
                            title="VOLUME TOTAL"
                            value={totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                            icon={Droplet}
                            description="Litros drenados"
                            variant="orange"
                        />
                        <StatsCard
                            title="MÉDIA POR DRENAGEM"
                            value={totalDrainages > 0 ? (totalLitros / totalDrainages).toFixed(1) : 0}
                            icon={Filter}
                            description="Litros / Aferição"
                            variant="default"
                        />
                    </div>

                    <FilterBar
                        onSearch={setSearchText}
                        searchValue={searchText}
                        searchPlaceholder="Buscar por posto ou responsável..."
                        hasActiveFilters={!!(fazendaId || postoId || usuarioId || dataInicio || dataFim)}
                        onClear={clearFilters}
                        advancedFilters={
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Fazenda</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={fazendaId}
                                        onChange={(e) => setFazendaId(e.target.value)}
                                    >
                                        <option value="">Todas</option>
                                        {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Posto</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400"
                                        value={postoId}
                                        onChange={(e) => setPostoId(e.target.value)}
                                        disabled={!fazendaId}
                                    >
                                        <option value="">{fazendaId ? 'Todos' : 'Selecione uma fazenda'}</option>
                                        {postos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Usuário</label>
                                    <select
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={usuarioId}
                                        onChange={(e) => setUsuarioId(e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Data Início</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={dataInicio}
                                        onChange={(e) => setDataInicio(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Data Fim</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={dataFim}
                                        onChange={(e) => setDataFim(e.target.value)}
                                    />
                                </div>
                            </>
                        }
                    />

                    {drainages.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Posto / Fazenda</th>
                                            <th className="px-6 py-4">Responsável</th>
                                            <th className="px-6 py-4 text-right">Litros</th>
                                            <th className="px-6 py-4">Aspecto & Destino</th>
                                            <th className="px-6 py-4 text-center">Fotos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewDrainages.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => setSelectedDrainage(item)}
                                            >
                                                <td className="px-6 py-4 text-slate-700 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {format(parseISO(item.data_drenagem), "dd/MM/yyyy")}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">
                                                        {item.posto?.nome}
                                                        {item.tanque_identificador && (
                                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                                                                {item.tanque_identificador}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400">{item.fazenda?.nome}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {item.usuario?.nome}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                    {item.litros_drenados.toLocaleString('pt-BR')} L
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs">
                                                        <span className="font-bold text-slate-600">Aspecto:</span> {item.aspecto_residuo}
                                                    </div>
                                                    <div className="text-xs mt-1">
                                                        <span className="font-bold text-slate-600">Destino:</span> {item.destino_residuo}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {item.fotos && item.fotos.length > 0 ? (
                                                        <a
                                                            href={item.fotos[0]}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        >
                                                            <ImageIcon size={14} />
                                                            {item.fotos.length}
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            title="Nenhuma drenagem registrada"
                            description="Os registros de drenagem dos tanques aparecerão aqui."
                            icon={Droplet}
                            action={
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                >
                                    Registrar Primeira Drenagem
                                </button>
                            }
                        />
                    )}
                </>
            )}


            {isSettingsOpen && (
                <DrainageEmailSettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}

            <DrainageBatchFormModal
                isOpen={isModalOpen && !selectedDrainage}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
            />

            <DrainageDetailsModal
                isOpen={!!selectedDrainage}
                onClose={() => setSelectedDrainage(null)}
                drainage={selectedDrainage}
                onUpdate={() => {
                    loadData();
                    setSelectedDrainage(null);
                }}
            />

            <DrainageTutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />
        </div>
    );
}
