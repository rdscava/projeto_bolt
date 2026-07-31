import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ClipboardPaste, Upload, Calendar } from 'lucide-react';

interface Props {
  onImport: (rows: string[][]) => void;
  onConvertDates?: () => void;
  placeholder?: string;
}

export default function PasteImport({ onImport, onConvertDates, placeholder }: Props) {
  const [text, setText] = useState('');

  const handleImport = () => {
    if (!text.trim()) return;
    const lines = text.trim().split('\n');
    const rows = lines.map(line => line.split('\t'));
    onImport(rows);
    setText('');
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <ClipboardPaste className="w-4 h-4" /> Colar Dados (copie do Excel e cole aqui)
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder || 'Cole os dados aqui (separados por TAB)...'}
        className="min-h-[120px] font-mono text-xs mb-3"
      />
      <div className="flex gap-2">
        <Button onClick={handleImport} className="gap-2">
          <Upload className="w-4 h-4" /> Importar Dados
        </Button>
        {onConvertDates && (
          <Button variant="outline" onClick={onConvertDates} className="gap-2">
            <Calendar className="w-4 h-4" /> Converter Datas (mm/aaaa → dd/mm/aaaa)
          </Button>
        )}
      </div>
    </div>
  );
}
