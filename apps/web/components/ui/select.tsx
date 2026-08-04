'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, value, onChange, placeholder, allowEmpty = false, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'flex h-10 w-full appearance-none rounded-xl border bg-transparent px-3 py-2 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {allowEmpty && <option value="">All</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };