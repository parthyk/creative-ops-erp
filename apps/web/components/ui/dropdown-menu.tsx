'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ open, onOpenChange, trigger, children, align = 'right', className }: DropdownProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null);

  React.useEffect(() => {
    if (open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: align === 'right' ? r.right : r.left, width: r.width });
    }
  }, [open, align]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {rect &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                style={{ top: rect.top, left: align === 'right' ? rect.left - 200 : rect.left, width: 200 }}
                className={cn(
                  'fixed z-50 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl',
                  className,
                )}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent',
        danger && 'text-destructive hover:bg-destructive/10',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}