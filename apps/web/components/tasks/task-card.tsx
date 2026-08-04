'use client';

import { motion } from 'framer-motion';
import { Clock, Paperclip, MessageSquare, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/skeleton';
import { STATUS_META, PRIORITY_META } from '@/lib/constants';
import type { Task } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export function TaskCard({ task, onOpen, index = 0 }: { task: Task; onOpen: (t: Task) => void; index?: number }) {
  const { user } = useAuth();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.03 }}
      onClick={() => onOpen(task)}
      className="group cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-foreground">{task.taskName}</p>
        <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_META[task.status].dot)} />
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{task.taskType}</Badge>
        <span className={cn('rounded-md px-1.5 py-0.5 font-medium', PRIORITY_META[task.priority].color)}>
          {PRIORITY_META[task.priority].label}
        </span>
        {task.client && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            {task.client.name}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-muted-foreground">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.actualTime || '0'}h</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(task.date, { day: 'numeric', month: 'short' })}</span>
          {task._count?.files ? (
            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{task._count.files}</span>
          ) : null}
        </div>
        {(task.employee && user?.role === 'MANAGER') && (
          <Avatar name={task.employee.name} src={task.employee.avatar} size="sm" />
        )}
      </div>
    </motion.div>
  );
}