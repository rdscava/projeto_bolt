import React, { createContext, useContext } from 'react';

interface RadioGroupContextValue {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  name?: string;
}

export function RadioGroup({ value, onValueChange, className = '', children, name }: RadioGroupProps) {
  const autoName = React.useId();
  const ctxValue = React.useMemo<RadioGroupContextValue>(() => ({
    value,
    onChange: onValueChange,
    name: name || `radio-${autoName}`,
  }), [value, onValueChange, name, autoName]);
  return (
    <RadioGroupContext.Provider value={ctxValue}>
      <div className={className} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({ value, id, disabled = false, className = 'h-4 w-4 accent-primary' }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error('RadioGroupItem must be used within RadioGroup');
  return (
    <input
      type="radio"
      id={id}
      name={ctx.name}
      value={value}
      checked={ctx.value === value}
      disabled={disabled}
      onChange={() => ctx.onChange(value)}
      className={className}
    />
  );
}
