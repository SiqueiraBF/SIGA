import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Sparkles, Package, Truck, ClipboardCheck } from 'lucide-react';

interface MenuCardProps {
    title: string;
    icon: React.ReactNode;
    route: string;
    colorClass: string;
}

function MenuCard({ title, icon, route, colorClass }: MenuCardProps) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(route)}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-300 active:scale-95 transition-all text-center h-full w-full"
        >
            <div className={`p-4 rounded-full ${colorClass} bg-opacity-10 text-opacity-90 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className="text-sm font-semibold text-slate-700 leading-tight">
                {title}
            </span>
        </button>
    );
}

export function MobileHome() {
    return (
        <div className="min-h-full bg-white px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28">
            <header className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                        <span className="font-extrabold text-sm tracking-wider">SIGA</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Mobile</span>
                </div>
                <h1 className="text-2xl font-black text-slate-800">
                    O que vamos fazer <br /> hoje?
                </h1>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                    Selecione um módulo abaixo para iniciar.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <MenuCard
                    title="Drenagem de Postos"
                    icon={<Droplet size={32} strokeWidth={1.5} className="text-blue-600" />}
                    colorClass="bg-blue-600 text-blue-600"
                    route="/app/drenagem"
                />
                <MenuCard
                    title="Limpeza e Organização"
                    icon={<Sparkles size={32} strokeWidth={1.5} className="text-emerald-500" />}
                    colorClass="bg-emerald-500 text-emerald-500"
                    route="/app/limpeza"
                />
                <MenuCard
                    title="Recebimento (Entrada)"
                    icon={<Package size={32} strokeWidth={1.5} className="text-orange-500" />}
                    colorClass="bg-orange-500 text-orange-500"
                    route="/app/recebimento"
                />
                <MenuCard
                    title="Expedição (Saída)"
                    icon={<Truck size={32} strokeWidth={1.5} className="text-indigo-500" />}
                    colorClass="bg-indigo-500 text-indigo-500"
                    route="/app/saida"
                />
                <MenuCard
                    title="Separação de Estoque"
                    icon={<ClipboardCheck size={32} strokeWidth={1.5} className="text-emerald-500" />}
                    colorClass="bg-emerald-500 text-emerald-500"
                    route="/app/separacao"
                />
            </div>

            <div className="mt-8 text-center px-6">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-100 mb-3">
                    <span className="text-xl">🚀</span>
                </div>
                <h3 className="text-sm font-bold text-slate-700">Mais módulos em breve</h3>
                <p className="text-xs text-slate-400 mt-1">O sistema está sendo adaptado continuamente.</p>
            </div>
        </div>
    );
}
