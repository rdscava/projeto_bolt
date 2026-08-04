import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Calculator, Users, History, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Demonstrativo from './pages/Demonstrativo';
import GestaoServidores from './pages/GestaoServidores';
import Simulacoes from './pages/Simulacoes';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | false | null)[]): string {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Demonstrativo', icon: Calculator },
    { to: '/servidores', label: 'Gestão de Servidores', icon: Users },
    { to: '/simulacoes', label: 'Simulações', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 z-40 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold">Aposentadoria</h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white p-4 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold">Aposentadoria</span>
        </header>

        <main key={location.pathname} className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Demonstrativo />} />
            <Route path="/servidores" element={<GestaoServidores />} />
            <Route path="/simulacoes" element={<Simulacoes />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
