'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Filter, Search, CalendarDays } from 'lucide-react';
import { get, patch, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState, Loading } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton, Avatar } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { TaskModal } from '@/components/tasks/task-modal';
import {
  TASK_TYPES, PRIORITIES, STATUS_META, PRIORITY_META,
} from '@/lib/constants';
import type { Task, Client, User } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export default function TasksPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('perPage', '100');
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      if (search) params.set('search', search);
      const res = await get<{ items: Task[] }>(`/tasks?${params.toString()}`);
      setTasks(res.items);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isManager) return;
    get<{ items: Client[] }>('/clients?perPage=200').then((r) => setClients(r.items)).catch(() => {});
    get<{ items: User[] }>('/users?perPage=200').then((r) => setEmployees(r.items)).catch(() => {});
    get<any[]>('/departments').then((r) => setDepartments(r)).catch(() => {});
  }, [isManager]);

  const setFilter = (k: string, v: string) => {
    setFilters((f) => {
      const next = { ...f };
      if (v) next[k] = v;
      else delete next[k];
      return next;
    });
  };

  const updateStatus = async (task: Task, status: string) => {
    try {
      await patch(`/tasks/${task.id}`, { status });
      toast.success(`Moved to ${STATUS_META[status as keyof typeof STATUS_META].label}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (task: Task) => {
    if (!confirm(`Delete "${task.taskName}"?`)) return;
    try {
      await del(`/tasks/${task.id}`);
      toast.success('Task deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openTask = (task: Task) => setModal({ open: true, task });

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description={isManager ? 'All tasks across the studio' : 'Your daily tasks'} >
        <Button onClick={() => setModal({ open: true, task: null })}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="w-56 pl-9" />
        </div>
        <Select options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))} allowEmpty placeholder="Status" value={filters.status} onChange={(v) => setFilter('status', v)} />
        <Select options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} allowEmpty placeholder="Priority" value={filters.priority} onChange={(v) => setFilter('priority', v)} />
        <Select options={TASK_TYPES.map((t) => ({ value: t, label: t }))} allowEmpty placeholder="Type" value={filters.taskType} onChange={(v) => setFilter('taskType', v)} />
        {isManager && (
          <>
            <Select options={clients.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Client" value={filters.clientId} onChange={(v) => setFilter('clientId', v)} />
            <Select options={departments.map((d) => ({ value: d.id, label: d.name }))} allowEmpty placeholder="Department" value={filters.departmentId} onChange={(v) => setFilter('departmentId', v)} />
            <Select options={employees.map((e) => ({ value: e.id, label: e.name }))} allowEmpty placeholder="Employee" value={filters.employeeId} onChange={(v) => setFilter('employeeId', v)} />
          </>
        )}
        <div className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" className="w-40" value={filters.from || ''} onChange={(e) => setFilter('from', e.target.value)} />
          <span className="text-muted-foreground">→</span>
          <Input type="date" className="w-40" value={filters.to || ''} onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        {(Object.keys(filters).length > 0 || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({}); setSearch(''); }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try adjusting your filters or create a new task."
          action={<Button onClick={() => setModal({ open: true, task: null })}><Plus className="h-4 w-4" /> New task</Button>}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                {isManager && <TableHead>Assignee</TableHead>}
                <TableHead>Client</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Est/Act</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => openTask(t)}>
                  <TableCell>
                    <p className="font-medium">{t.taskName}</p>
                    {t.description && <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{t.taskType}</Badge></TableCell>
                  {isManager && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={t.employee?.name} size="sm" />
                        <span className="text-sm">{t.employee?.name || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">{t.client?.name || '—'}</TableCell>
                  <TableCell>
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', PRIORITY_META[t.priority].color)}>
                      {PRIORITY_META[t.priority].label}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StatusMenu task={t} onStatus={updateStatus} onDelete={remove} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskModal open={modal.open} task={modal.task} onOpenChange={(v) => setModal({ open: v, task: v ? modal.task : null })} onSaved={load} />
    </div>
  );
}

function StatusMenu({ task, onStatus, onDelete }: { task: Task; onStatus: (t: Task, s: string) => void; onDelete: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} trigger={
      <Badge variant="secondary" className="cursor-pointer">
        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[task.status].dot)} />
        {STATUS_META[task.status].label}
      </Badge>
    }>
      {Object.entries(STATUS_META).filter(([s]) => s !== 'CANCELLED').map(([s, m]) => (
        <DropdownItem key={s} onClick={() => { onStatus(task, s); setOpen(false); }}>
          <span className={cn('h-2 w-2 rounded-full', m.dot)} /> {m.label}
        </DropdownItem>
      ))}
      <DropdownSeparator />
      <DropdownItem danger onClick={() => onDelete(task)}>Delete task</DropdownItem>
    </DropdownMenu>
  );
}