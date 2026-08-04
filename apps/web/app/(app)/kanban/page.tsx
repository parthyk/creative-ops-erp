'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { get, patch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskModal } from '@/components/tasks/task-modal';
import { STATUS_META } from '@/lib/constants';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DELAYED', 'DONE'] as const;

export default function KanbanPage() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<{ status: string; items: Task[] }[]>([]);
  const [filters, setFilters] = useState<{ clientId?: string; departmentId?: string }>({});
  const [drone, setDrone] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '500' });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const res = await get<{ status: string; items: Task[] }[]>(`/tasks/kanban?${params.toString()}`);
      setColumns(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (!id) return;
    setDrone(null);
    const col = columns.find((c) => c.status === status);
    const movingCol = columns.find((c) => c.items.some((t) => t.id === id));
    if (!col || !movingCol) return load();
    setColumns((cols) =>
      cols.map((c) => {
        if (c.status === movingCol.status) return { ...c, items: c.items.filter((t) => t.id !== id) };
        if (c.status === status) {
          const task = movingCol.items.find((t) => t.id === id)!;
          return { ...c, items: [{ ...task, status: status as any }, ...c.items] };
        }
        return c;
      }),
    );
    if (id) patch(`/tasks/${id}`, { status }).catch(() => load());
  };

  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const onDragEnter = (status: string) => setDrone(status);
  const onDragLeave = () => setDrone(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Kanban Board" description="Drag tasks across stages to update them" />

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((_, i) => <div key={i} className="skeleton h-96 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(columns as any[]).map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { setDrone(null); onDrop(e, col.status); }}
              onDragEnter={() => onDragEnter(col.status)}
              onDragLeave={onDragLeave}
              className={cn('rounded-2xl border bg-muted/30 p-3 transition-all', drone === col.status && 'border-primary/50 ring-2 ring-primary/30')}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', STATUS_META[col.status as keyof typeof STATUS_META].dot)} />
                  <span className="text-sm font-semibold">{STATUS_META[col.status as keyof typeof STATUS_META].label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{col.items.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {col.items.map((t: any, i: number) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, t)}
                    onClick={() => setModal({ open: true, task: t })}
                  >
                    <TaskCard task={t} onOpen={(task) => setModal({ open: true, task })} index={i} />
                  </div>
                ))}
                {col.items.length === 0 && (
                  <button
                    onClick={() => setModal({ open: true, task: null })}
                    className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" /> Add task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskModal open={modal.open} task={modal.task} onOpenChange={(v) => setModal({ open: v, task: v ? modal.task : null })} onSaved={load} />
    </div>
  );
}