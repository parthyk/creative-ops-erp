'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Globe, Pencil, History, Users } from 'lucide-react';
import { get, post, patch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, Loading } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/skeleton';
import { STAKEHOLDER_META, STAKEHOLDER_ROLES, CLIENT_STATUS, CLIENT_PRIORITY } from '@/lib/constants';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import type { Client, User } from '@/lib/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [client, setClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<string | null>(null);
  const [assignEmp, setAssignEmp] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [form, setForm] = useState<any>({});

  const load = async () => {
    try {
      setClient(await get<Client>(`/clients/${id}`));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (isManager) get<{ items: User[] }>('/users?perPage=200').then((r) => setEmployees(r.items)).catch(() => {});
  }, [isManager]);

  if (!client) return <Loading label="Loading client…" />;

  const primary = (client.brandColors as any)?.primary || '#8b5cf6';
  const colors = client.brandColors ? Object.entries(client.brandColors as Record<string, string>) : [];

  const assign = async () => {
    if (!assignEmp) return toast.error('Select an employee');
    try {
      await post(`/clients/${client.id}/stakeholders`, {
        role: assignRole,
        employeeId: assignEmp,
        reason: assignReason || undefined,
      });
      toast.success('Stakeholder assigned');
      setAssignRole(null);
      setAssignEmp('');
      setAssignReason('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const save = async () => {
    try {
      await patch(`/clients/${client.id}`, form);
      toast.success('Client updated');
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow" style={{ background: primary }}>
              {client.logoUrl ? <img src={client.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" /> : client.name.charAt(0)}
            </span>
            {client.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {client.industry && <span>{client.industry}</span>}
            {client.website && (
              <a href={`https://${client.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <Globe className="h-3 w-3" /> {client.website}
              </a>
            )}
            <Badge variant="secondary">{client.contractType.toLowerCase()}</Badge>
            <Badge variant="secondary" className={CLIENT_STATUS[client.status]?.color}>{CLIENT_STATUS[client.status]?.label}</Badge>
            <span className={cn('text-xs font-medium', CLIENT_PRIORITY[client.priority]?.color)}>{client.priority} priority</span>
          </span>
        }
      >
        {isManager && <Button variant="outline" onClick={() => { setForm(client); setEditOpen(true); }}><Pencil className="h-4 w-4" /> Edit</Button>}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Brand identity */}
        <Card>
          <CardHeader><CardTitle>Brand identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand colors</p>
              <div className="flex flex-wrap gap-2">
                {colors.map(([k, v]) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <span className="h-9 w-9 rounded-xl border shadow-sm" style={{ background: v }} />
                    <span className="text-[10px] text-muted-foreground">{k}</span>
                  </div>
                ))}
              </div>
            </div>
            {client.fonts && client.fonts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Fonts</p>
                <div className="flex flex-wrap gap-1.5">
                  {client.fonts.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                </div>
              </div>
            )}
            {client.brandAssets && client.brandAssets.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand assets</p>
                <div className="space-y-1">
                  {client.brandAssets.map((a) => <p key={a} className="text-sm text-muted-foreground">• {a}</p>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stakeholders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Stakeholders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {STAKEHOLDER_ROLES.map((role) => {
                const s = client.stakeholders?.find((st) => st.role === role);
                return (
                  <div key={role} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={STAKEHOLDER_META[role].color}>{STAKEHOLDER_META[role].label}</Badge>
                      {isManager && (
                        <button
                          onClick={() => { setAssignRole(role); setAssignEmp(s?.employeeId || ''); }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {s ? 'Change' : 'Assign'}
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <Avatar name={s?.employee?.name || s?.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s?.employee?.name || s?.name || 'Unassigned'}</p>
                        <p className="truncate text-xs text-muted-foreground">{s?.title || s?.email || `Since ${formatDate(s?.assignedAt)}`}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* History */}
            {client.stakeholderLogs && client.stakeholderLogs.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Stakeholder history
                </p>
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {client.stakeholderLogs.map((h: any) => (
                    <div key={h.id} className="rounded-lg border bg-muted/30 p-2.5 text-sm">
                      <span className="font-medium">{STAKEHOLDER_META[h.role as keyof typeof STAKEHOLDER_META]?.label || h.role}</span>{' '}
                      <span className="text-muted-foreground">→</span>{' '}
                      <span className="font-medium text-primary">{h.newName || 'Unassigned'}</span>
                      {h.previousName && <span className="text-muted-foreground"> (was {h.previousName})</span>}
                      {h.reason && <p className="mt-0.5 text-xs italic text-muted-foreground">"{h.reason}"</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">by {h.changedBy?.name || '—'} · {timeAgo(h.date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client tasks */}
      <Card>
        <CardHeader><CardTitle>Recent tasks</CardTitle></CardHeader>
        <CardContent>
          {client.tasks && client.tasks.length > 0 ? (
            <div className="space-y-2">
              {client.tasks.slice(0, 8).map((t: any) => (
                <Link key={t.id} href="/tasks" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent">
                  <span className={cn('h-2 w-2 rounded-full', t.status === 'DONE' ? 'bg-emerald-500' : t.status === 'DELAYED' ? 'bg-red-500' : 'bg-blue-500')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.taskName}</p>
                    <p className="text-xs text-muted-foreground">{t.taskType} · {t.employee?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No tasks for this client yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Assign stakeholder dialog */}
      <Dialog
        open={!!assignRole}
        onOpenChange={(v) => !v && setAssignRole(null)}
        title="Assign stakeholder"
        description={`${STAKEHOLDER_META[assignRole as keyof typeof STAKEHOLDER_META]?.label || ''} for ${client.name}`}
        footer={<><Button variant="ghost" onClick={() => setAssignRole(null)}>Cancel</Button><Button onClick={assign}>Assign</Button></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select
              options={employees.map((e) => ({ value: e.id, label: `${e.name} — ${e.designation || e.department?.name || ''}` }))}
              placeholder="Select employee"
              value={assignEmp}
              onChange={setAssignEmp}
            />
          </div>
          <div>
            <Label>Reason for change (optional)</Label>
            <Textarea value={assignReason} onChange={(e) => setAssignReason(e.target.value)} placeholder="e.g. Leave of absence, workload balance…" />
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit client"
        footer={<><Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Industry</Label><Input value={form.industry || ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
          <div><Label>Website</Label><Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={Object.keys(CLIENT_STATUS).map((k) => ({ value: k, label: CLIENT_STATUS[k].label }))} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority || ''} onChange={(v) => setForm({ ...form, priority: v })} options={Object.keys(CLIENT_PRIORITY).map((k) => ({ value: k, label: k }))} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}