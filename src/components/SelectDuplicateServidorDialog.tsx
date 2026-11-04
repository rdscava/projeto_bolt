import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Servidor } from '../types';

interface Props {
  open: boolean;
  servidores: Servidor[];
  onSelect: (s: Servidor) => void;
  onCancel: () => void;
}

export default function SelectDuplicateServidorDialog({ open, servidores, onSelect, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registro duplicado</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Foram encontrados {servidores.length} registros com essa mesma base de RF, diferindo no dígito após o "V". Selecione o registro desejado.
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {servidores.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="text-left rounded-md border border-border p-3 transition-colors hover:bg-muted"
            >
              <div className="font-medium font-mono">RF {s.rf}</div>
              <div className="text-sm">{s.nome}</div>
              <div className="text-xs text-muted-foreground">{s.cargo}{s.referencia ? ` - ${s.referencia}` : ''}</div>
              <div className="text-xs text-muted-foreground">{s.nomeSetor}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
