import { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Users, FileText, TrendingUp, Database, Building2, FileCheck, Layers, Calculator, History, Menu, X, Wallet } from 'lucide-react';
import GestaoServidores from './pages/GestaoServidores';
import Demonstrativo from './pages/Demonstrativo';
import Indices from './pages/Indices';
import SigpecBase from './pages/SigpecBase';
import Admrh from './pages/Admrh';
import Averbacao from './pages/Averbacao';
import BaseJuncao from './pages/BaseJuncao';
import MediaAposentadoria from './pages/MediaAposentadoria';
import Simulacoes from './pages/Simulacoes';
import Pagamento from './pages/Pagamento';

const NAV_ITEMS = [
  { id: 'servidores', label: 'Gestão de Servidores', icon: Users },
  { id: 'demonstrativo', label: 'Demonstrativo', icon: FileText },
  { id: 'indices', label: 'Índices', icon: TrendingUp },
  { id: 'sigpec', label: 'SIGPEC Base', icon: Database },
  { id: 'admrh', label: 'ADMRH', icon: Building2 },
  { id: 'averbacao', label: 'Averbação', icon: FileCheck },
  { id: 'basejuncao', label: 'Base Junção', icon: Layers },
  { id: 'media', label: 'Média Aposentadoria', icon: Calculator },
  { id: 'pagamento', label: 'Pagamento', icon: Wallet },
  { id: 'simulacoes', label: 'Simulações', icon: History },
] as const;

function AppContent() {
  const [page, setPage] = useState<string>('demonstrativo');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { hasUnsavedData, activeSimulation } = useAppContext();

  const renderPage = () => {
    switch (page) {
      case 'servidores': return <GestaoServidores />;
      case 'demonstrativo': return <Demonstrativo />;
      case 'indices': return <Indices />;
      case 'sigpec': return <SigpecBase />;
      case 'admrh': return <Admrh />;
      case 'averbacao': return <Averbacao />;
      case 'basejuncao': return <BaseJuncao />;
      case 'media': return <MediaAposentadoria />;
      case 'pagamento': return <Pagamento />;
      case 'simulacoes': return <Simulacoes />;
      default: return <Demonstrativo />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-200 border-r border-border bg-card flex-shrink-0`}>
        <div className="p-4 border-b border-border">
          <h1 className="text-sm font-bold leading-tight">Cálculo de Média de Aposentadoria</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sistema de Cálculo de Proventos</p>
          {activeSimulation && (
            <div className="mt-1.5 text-xs text-muted-foreground truncate">
              Simulação: <strong className="text-foreground">{activeSimulation.nome}</strong>
            </div>
          )}
          {hasUnsavedData && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-600">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Alterações não salvas
            </div>
          )}
        </div>
        <div className="h-[calc(100vh-73px)] overflow-y-auto">
          <nav className="p-2 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border flex items-center px-4 gap-3 bg-card flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{NAV_ITEMS.find(n => n.id === page)?.label}</span>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1200px] mx-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}
