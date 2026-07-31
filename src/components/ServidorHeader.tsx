import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { fetchServidores } from '../services/servidorService';
import { formatRFMask } from '../lib/format';

export default function ServidorHeader() {
  const { servidor, setServidor } = useAppContext();
  const [rfInput, setRfInput] = useState(servidor?.rf || '');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!rfInput.trim()) return;
    setLoading(true);
    try {
      const servidores = await fetchServidores(rfInput.replace(/\D/g, '').slice(0, 3));
      const found = servidores.find(s => s.rf === rfInput || s.rf.replace(/\D/g, '') === rfInput.replace(/\D/g, ''));
      if (found) {
        setServidor(found);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
        <Search className="w-4 h-4" /> Dados do Servidor
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">RF (000.000.0 V0)</Label>
          <div className="flex gap-2">
            <Input
              value={rfInput}
              onChange={e => { setRfInput(formatRFMask(e.target.value)); }}
              placeholder="000.000.0"
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={servidor?.nome || ''} readOnly className="bg-muted/50" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Cargo/Função</Label>
          <Input value={servidor?.cargo || ''} readOnly className="bg-muted/50" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Referência</Label>
          <Input value={servidor?.referencia || ''} readOnly className="bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
