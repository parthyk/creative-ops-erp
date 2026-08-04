'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarDays, Clock, Paperclip, MessageSquare, Send } from 'lucide-react';
import { post, patch, get } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  TASK_TYPES, TASK_STATUSES, PRIORITIES, STATUS_META, PRIORITY_META, STAKEHOLDER_ROLES,
} from '@/lib/constants';
import type { Client, Task, TaskType, TaskStatus, Priority, User } from '@/lib/types';
import { formatDate, timeAgo } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  onSaved?: () => void;
}

export function TaskModal({ open, onOpenChange, task, onSaved }: Props) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [form, setForm] = useState<any>({
    date: '',
    taskType: 'Creative',
    priority: 'MEDIUM',
    status: 'TODO',
    estimatedTime: 1,
    actualTime: 0,
    taskCount: 1,
    taskName: '',
    description: '',
    clientId: '',
    departmentId: '',
    employeeId: '',
    reviewerId: '',
    dueDate: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      date: new Date().toISOString().slice(0, 10),
      taskType: 'Creative',
      priority: 'MEDIUM',
      status: 'TODO',
      estimatedTime: 1,
      actualTime: 0,
      taskCount: 1,
      taskName: '',
      description: '',
      clientId: '',
      departmentId: '',
      employeeId: '',
      reviewerId: '',
      dueDate: '',
      ...(task
        ? {
            date: (task.date || '').slice(0, 10),
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
            taskType: task.taskType,
            priority: task.priority,
            status: task.status,
            estimatedTime: task.estimatedTime,
            actualTime: task.actualTime,
            taskCount: task.taskCount,
            taskName: task.taskName,
            description: task.description || '',
            clientId: task.clientId || '',
            departmentId: task.departmentId || '',
            employeeId: task.employeeId || '',
            reviewerId: task.reviewerId || '',
          }
        : {}),
    });
    if (isManager) {
      get<{ items: Client[] }>('/clients?perPage=200').then((r) => setClients(r.items)).catch(() => {});
      get<{ items: User[] }>('/users?perPage=200').then((r) => setEmployees(r.items)).catch(() => {});
      get<any[]>('/departments').then((r) => setDepartments(r)).catch(() => {});
    }
  }, [open, task, isManager]);

  const save = async () => {
    if (!form.taskName.trim()) {
      toast.error('Task name is required');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        clientId: form.clientId || undefined,
        departmentId: form.departmentId || undefined,
        employeeId: form.employeeId || undefined,
        reviewerId: form.reviewerId || undefined,
      };
      if (task) {
        await patch(`/tasks/${task.id}`, payload);
        toast.success('Task updated');
      } else {
        await post('/tasks', payload);
        toast.success('Task created');
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!task) return;
    setBusy(true);
    try {
      await patch(`/tasks/${task.id}`, { status });
      toast.success(`Moved to ${STATUS_META[status as TaskStatus].label}`);
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async () => {
    if (!task || !comment.trim()) return;
    try {
      await post(`/tasks/${task.id}/comments`, { body: comment });
      setComment('');
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? task.taskName : 'New task'}
      description={task ? `Created ${formatDate(task.date)}` : 'Log a daily task'}
      className="max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Task name *</Label>
          <Input value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })} placeholder="e.g. Social media calendar" />
        </div>

        <div>
          <Label>Task type</Label>
          <Select options={TASK_TYPES.map((t) => ({ value: t, label: t }))} value={form.taskType} onChange={(v) => setForm({ ...form, taskType: v })} />
        </div>
        <div>
          <Label>Priority</Label>
          <Select options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} />
        </div>

        {isManager && (
          <>
            <div>
              <Label>Client</Label>
              <Select options={clients.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select client" allowEmpty value={form.clientId} onChange={(v) => setForm({ ...form, clientId: v })} />
            </div>
            <div>
              <Label>Department</Label>
              <Select options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Select department" allowEmpty value={form.departmentId} onChange={(v) => setForm({ ...form, departmentId: v })} />
            </div>
            <div>
              <Label>Assignee</Label>
              <Select options={employees.map((e) => ({ value: e.id, label: e.name }))} placeholder="Select employee" allowEmpty value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} />
            </div>
            <div>
              <Label>Reviewer</Label>
              <Select options={employees.map((e) => ({ value: e.id, label: e.name }))} placeholder="Select reviewer" allowEmpty value={form.reviewerId} onChange={(v) => setForm({ ...form, reviewerId: v })} />
            </div>
          </>
        )}

        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <div>
            <Label>Estimated (hrs)</Label>
            <Input type="number" step="0.5" value={form.estimatedTime} onChange={(e) => setForm({ ...form, estimatedTime: +e.target.value })} />
          </div>
          <div>
            <Label>Actual (hrs)</Label>
            <Input type="number" step="0.5" value={form.actualTime} onChange={(e) => setForm({ ...form, actualTime: +e.target.value })} />
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done…" />
        </div>

        <div className="sm:col-span-2">
          <Label>Status</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {TASK_STATUSES.filter((s) => s !== 'CANCELLED').map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  form.status === s ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {task && (
        <div className="mt-4 rounded-xl border bg-muted/30 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'DELAYED'].map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={busy}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                  task.status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {STATUS_META[s as TaskStatus].label}
              </button>
            ))}
          </div>

          {task.comments && task.comments.length > 0 && (
            <div className="mt-3 space-y-2">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={c.author.name} size="sm" />
                  <div className="rounded-xl bg-card px-3 py-2 text-sm">
                    <span className="font-medium">{c.author.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    <p className="mt-0.5 text-muted-foreground">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
            <Button size="iconSm" variant="secondary" onClick={submitComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={save} disabled={busy}>{task ? 'Save changes' : 'Create task'}</Button>
      </div>
    </Dialog>
  );
}