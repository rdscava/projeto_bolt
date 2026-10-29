import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  value: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  setValue: (v: string) => void;
}>({ value: '', open: false, setOpen: () => {}, setValue: () => {} });

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);
  const setValue = useCallback((v: string) => { onValueChange(v); setOpen(false); }, [onValueChange]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, open, setOpen, setValue }}>
      <div ref={ref} className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
    >
      {children}
      <svg className="h-4 w-4 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
  );
}

export function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
  const { value } = React.useContext(SelectContext);
  const display = children || value || placeholder;
  return <span className={value ? '' : 'text-muted-foreground'}>{display}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div className="absolute z-50 mt-1 w-full max-h-[300px] overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-xl">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: selected, setValue } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={`flex w-full items-center px-3 py-1.5 text-sm text-left hover:bg-muted ${value === selected ? 'font-medium bg-muted' : ''}`}
    >
      {children}
    </button>
  );
}
