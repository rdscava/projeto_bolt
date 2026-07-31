import React, { useState, useEffect } from 'react';

interface AlertDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <AlertDialogContext.Provider value={{ open, setOpen }}>{children}</AlertDialogContext.Provider>;
}

const AlertDialogContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  const child = React.Children.only(children) as React.ReactElement;
  return React.cloneElement(child, { onClick: (e: React.MouseEvent) => { child.props.onClick?.(e); setOpen(true); } });
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(AlertDialogContext);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl mx-4">
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>;
}

export function AlertDialogCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <button
      className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
      onClick={() => { onClick?.(); setOpen(false); }}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <button
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onClick={() => { onClick?.(); setOpen(false); }}
    >
      {children}
    </button>
  );
}
