import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchAllServidores, deleteServidor } from '../services/servidorService';
import { toast } from 'sonner';
import type { Servidor } from '../types';

interface DuplicateGroup {
  key: string;
  servidores: Servidor[];
}

interface DuplicateServidoresDialogProps {
  onResolved: () => void;
}

function rfBase(rf: string): string {
  return rf.replace(/\D/g, '').slice(0, 7);
}

function findDuplicateGroups(all: Servidor[]): DuplicateGroup[] {
  const byBase = new Map<string, Servidor[]>();
  for (const s of all) {
    const key = rfBase(s.rf);
    if (!key) continue;
    const list = byBase.get(key) ?? [];
    list.push(s);
    byBase.set(key, list);
  }
  return [...byBase.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, servidores]) => ({ key, servidores }));
}

export default function DuplicateServidoresDialog({ onResolved }: DuplicateServidoresDialogProps) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllServidores()
      .then(all => {
        if (cancelled) return;
        const found = findDuplicateGroups(all);
        setGroups(found);
        setOpen(found.length > 0);
      })
      .catch(() => {
        if (!cancelled) toast.error('Erro ao verificar registros duplicados');
      });
    return () => { cancelled = true; };
  }, []);

  const current = groups[0];

  useEffect(() => { setSelectedId(null); }, [current?.key]);

  const handleKeep = async () => {
    if (!current || !selectedId) return;
    const toRemove = current.servidores.filter(s => s.id !== selectedId);
    setSaving(true);
    try {
      for (const s of toRemove) {
        if (s.id) await deleteServidor(s.id);
      }
      const remaining = groups.slice(1);
      setGroups(remaining);
      onResolved();
      if (remaining.length === 0) {
        setOpen(false);
        toast.success('Todos os registros duplicados foram resolvidos');
      }
    } catch {
      toast.error('Não foi possível excluir o registro duplicado');
    } finally {
      setSaving(false);
    }
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registro duplicado</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Os registros abaixo têm o mesmo RF, mas diferem no dígito após o "V". Escolha o que deve ser mantido ({groups.length} grupo{groups.length > 1 ? 's' : ''} restante{groups.length > 1 ? 's' : ''}).
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {current.servidores.map(s => {
            const active = selectedId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id ?? null)}
                className={`text-left rounded-md border p-3 transition-colors ${active ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border hover:bg-muted'}`}
              >
                <div className="font-medium">RF {s.rf}</div>
                <div className="text-sm">{s.nome}</div>
                <div className="text-xs text-muted-foreground">{s.cargo} {s.referencia ? `- ${s.referencia}` : ''}</div>
                <div className="text-xs text-muted-foreground">{s.nomeSetor}</div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleKeep} disabled={!selectedId || saving}>
            {saving ? 'Excluindo...' : 'Manter selecionado e excluir os outros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
