import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-inter">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg text-slate-800">SIGA</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-500 pb-20 md:pb-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
