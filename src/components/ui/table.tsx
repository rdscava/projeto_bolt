import React from 'react';

export function Table({ className = '', ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full caption-bottom text-sm ${className}`} {...props} />;
}

export function TableHeader({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`[&_tr]:border-b ${className}`} {...props} />;
}

export function TableBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />;
}

export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b border-border transition-colors hover:bg-muted/50 ${className}`} {...props} />;
}

export function TableHead({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={`h-9 px-2 text-left align-middle text-xs font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />;
}

export function TableCell({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={`p-2 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />;
}
