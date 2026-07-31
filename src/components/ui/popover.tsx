import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  children: React.ReactNode;
}

const PopoverContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void; close: () => void }>({
  open: false, setOpen: () => {}, close: () => {},
});

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return <PopoverContext.Provider value={{ open, setOpen, close }}><div ref={ref} className="relative inline-block">{children}</div></PopoverContext.Provider>;
}

export function PopoverTrigger({ children }: { children: React.ReactElement; asChild?: boolean }) {
  const { open, setOpen } = React.useContext(PopoverContext);
  const child = React.Children.only(children) as React.ReactElement;
  return React.cloneElement(child, { onClick: (e: React.MouseEvent) => { child.props.onClick?.(e); setOpen(!open); } });
}

export function PopoverContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { open } = React.useContext(PopoverContext);
  if (!open) return null;
  return (
    <div className={`absolute z-50 mt-2 rounded-md border border-slate-300 bg-white p-4 shadow-xl ${className}`}>
      {children}
    </div>
  );
}
