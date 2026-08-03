import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { searchServidorByRF } from '../services/servidorService';
import { formatRFMask } from '../lib/format';

interface Props {
  extraFields?: boolean;
}

export default function ServidorHeader({ extraFields = true }: Props) {
  const { servidor, setServidor } = useAppContext();
  const [rfInput, setRfInput] = useState(servidor?.rf || '');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!rfInput.trim()) return;
    setLoading(true);
    try {
      const found = await searchServidorByRF(rfInput);
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
        {extraFields && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Relação Jur-Adm</Label>
              <Input value={servidor?.relacaoJurAdm || ''} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Jornada</Label>
              <Input value={servidor?.jornada || ''} readOnly className="bg-muted/50" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Nome do Setor</Label>
              <Input value={servidor?.nomeSetor || ''} readOnly className="bg-muted/50" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
