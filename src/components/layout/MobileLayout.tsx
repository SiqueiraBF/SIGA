import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

export function MobileLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
            {/* Scrollable Content Area */}
            <main className="flex-1 overflow-y-auto pb-20">
                <Outlet />
            </main>

            {/* Fixed Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-center items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
                <button
                    onClick={() => navigate('/app')}
                    className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-colors ${location.pathname === '/app'
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-slate-400 hover:text-slate-600 active:bg-slate-50'
                        }`}
                >
                    <Home size={24} strokeWidth={location.pathname === '/app' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold tracking-wide">Início</span>
                </button>
            </nav>
        </div>
    );
}
