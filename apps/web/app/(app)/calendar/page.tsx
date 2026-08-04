'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, CheckCircle2, XCircle, Clock, Plane,
} from 'lucide-react';
import { get, post, patch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CalEvent {
  id: string;
  taskName: string;
  date: string;
  status: string;
  priority: string;
  client?: { name: string } | null;
  employee?: { name: string } | null;
  kind: 'task' | 'leave' | 'holiday';
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [checkInState, setCheckInState] = useState<any>(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const from = new Date(cursor.y, cursor.m, 1).toISOString();
      const to = new Date(cursor.y, cursor.m + 1, 0).toISOString();
      const [tasks, h, l, att] = await Promise.all([
        get<CalEvent[]>('/tasks/calendar?from=' + from + '&to=' + to),
        get<any[]>('/calendar/holidays'),
        get<any[]>(isManager ? '/calendar/leaves' : '/calendar/leaves/mine'),
        get<any>(isManager ? '/calendar/attendance/mine' : '/calendar/attendance/mine'),
      ]);
      setEvents(
        tasks.map((t) => ({ ...t, kind: 'task' as const })),
      );
      setHolidays(h);
      setLeaves(l);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [cursor, isManager]);

  const checkIn = async () => {
    try {
      const res = await post('/calendar/attendance/check-in');
      setCheckInState(res);
      toast.success(res.action === 'checkout' ? 'Checked out' : res.action === 'checkin' ? 'Checked in' : 'Already checked in');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const requestLeave = async () => {
    try {
      await post('/calendar/leaves', leaveForm);
      toast.success('Leave requested');
      setLeaveModal(false);
      setLeaveForm({});
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const decide = async (id: string, status: string) => {
    try {
      await patch(`/calendar/leaves/${id}`, { status });
      toast.success(`Leave ${status.toLowerCase()}`);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const list: (Date | null)[] = Array.from({ length: startDow }, () => null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(cursor.y, cursor.m, d));
    return list;
  }, [cursor]);

  const monthKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10);

  const nav = (dir: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Tasks, deadlines, leaves and holidays">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-semibold">
            {new Date(cursor.y, cursor.m).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => nav(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((c) => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })}>Today</Button>
          <Button variant="outline" size="sm" onClick={checkIn} className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {checkInState?.action === 'checkout' ? 'Check out' : 'Check in'}
          </Button>
          <Button size="sm" onClick={() => setLeaveModal(true)}><Plus className="h-4 w-4" /> Leave</Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-3">
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const key = monthKey(d);
                  const dayEvents = events.filter((e) => e.date.slice(0, 10) === key && e.kind === 'task');
                  const holiday = holidays.find((h) => h.date.slice(0, 10) === key);
                  const dayLeaves = leaves.filter((l) => key >= l.startDate.slice(0, 10) && key <= l.endDate.slice(0, 10));
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-24 rounded-xl border p-1.5 transition-colors',
                        isToday ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                        holiday && 'border-amber-500/40 bg-amber-500/5',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold', isToday && 'bg-primary text-primary-foreground')}>
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {holiday && (
                          <div className="truncate rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                            🎉 {holiday.name}
                          </div>
                        )}
                        {dayLeaves.map((l: any) => (
                          <div key={l.id} className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium', l.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-blue-500/15 text-blue-600 dark:text-blue-300')}>
                            {l.employee?.name || 'You'} · {l.type} leave
                          </div>
                        ))}
                        {dayEvents.slice(0, 3).map((e) => (
                          <Link
                            key={e.id}
                            href="/tasks"
                            className={cn(
                              'block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                              e.status === 'DONE' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : e.status === 'DELAYED' ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-primary/10 text-primary',
                            )}
                          >
                            {e.taskName}
                          </Link>
                        ))}
                        {dayEvents.length > 3 && <div className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {events.filter((e) => e.kind === 'task' && e.status !== 'DONE').slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <span className={cn('h-2 w-2 rounded-full', e.status === 'DELAYED' ? 'bg-red-500' : 'bg-primary')} />
                  <span className="min-w-0 flex-1 truncate">{e.taskName}</span>
                  <span className="text-xs text-muted-foreground">{e.date.slice(5, 10)}</span>
                </div>
              ))}
              {!events.filter((e) => e.kind === 'task' && e.status !== 'DONE').length && (
                <p className="py-4 text-center text-sm text-muted-foreground">No tasks this month</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Leave requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {leaves.slice(0, 6).map((l) => (
                <div key={l.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{l.employee?.name || 'You'}</span>
                    <Badge variant={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'destructive' : 'warning'}>{l.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.startDate.slice(0, 10)} → {l.endDate.slice(0, 10)} · {l.type}
                  </p>
                  {isManager && l.status === 'PENDING' && (
                    <div className="mt-2 flex gap-2">
                      <Button size="xs" variant="default" onClick={() => decide(l.id, 'APPROVED')}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                      <Button size="xs" variant="outline" onClick={() => decide(l.id, 'REJECTED')}><XCircle className="h-3 w-3" /> Reject</Button>
                    </div>
                  )}
                </div>
              ))}
              {!leaves.length && <p className="py-4 text-center text-sm text-muted-foreground">No leave requests</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={leaveModal}
        onOpenChange={setLeaveModal}
        title="Request leave"
        footer={<><Button variant="ghost" onClick={() => setLeaveModal(false)}>Cancel</Button><Button onClick={requestLeave}>Submit request</Button></>}
      >
        <div className="grid gap-4">
          <div><Label>Start date</Label><Input type="date" value={leaveForm.startDate || ''} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
          <div><Label>End date</Label><Input type="date" value={leaveForm.endDate || ''} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={leaveForm.type || 'CASUAL'} onChange={(v) => setLeaveForm({ ...leaveForm, type: v })} options={['CASUAL', 'SICK', 'EARNED', 'COMPENSATORY', 'OTHER'].map((t) => ({ value: t, label: t }))} />
          </div>
          <div><Label>Reason</Label><Input value={leaveForm.reason || ''} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
        </div>
      </Dialog>
    </div>
  );
}