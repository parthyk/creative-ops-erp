'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Briefcase, Globe, Search } from 'lucide-react';
import { get, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { CLIENT_PRIORITY, CLIENT_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/types';

const CONTRACT_TYPES = ['RETAINER', 'PROJECT'];

export default function ClientsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    try {
      const path = isManager ? '/clients?perPage=200' : '/clients/mine';
      const res = await get<any>(path);
      const items = isManager ? res.items : res;
      setClients(items);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isManager]);

  const create = async () => {
    if (!form.name?.trim()) return toast.error('Client name is required');
    try {
      const c = await post<Client>('/clients', form);
      toast.success('Client created');
      setCreateOpen(false);
      setForm({});
      router.push(`/clients/${c.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = clients.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description={isManager ? 'Manage accounts, brands and stakeholders' : 'Clients you are assigned to'}>
        {isManager && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add client</Button>
        )}
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No clients found" description="Create a client to start assigning tasks and stakeholders." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const primary = (c.brandColors as any)?.primary || '#8b5cf6';
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <Link
                  href={`/clients/${c.id}`}
                  className="glass-card soft-shadow group block p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-white shadow" style={{ background: primary }}>
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{c.name.charAt(0)}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className={CLIENT_STATUS[c.status]?.color}>
                      {CLIENT_STATUS[c.status]?.label || c.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold leading-tight group-hover:text-primary">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.industry || '—'}</p>

                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                    <span className={cn('font-medium', CLIENT_PRIORITY[c.priority]?.color)}>
                      {c.priority} priority
                    </span>
                    <span className="text-muted-foreground">{c._count?.tasks ?? 0} tasks</span>
                  </div>
                  {c.stakeholders && c.stakeholders.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.stakeholders.slice(0, 3).map((s) => (
                        <span key={s.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {s.role.toLowerCase()}: {s.employee?.name || s.name || '—'}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add client"
        description="Create a new client account"
        footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create}>Create client</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Client name *</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AMM Aqua" /></div>
          <div><Label>Industry</Label><Input value={form.industry || ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
          <div><Label>Website</Label><Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div>
            <Label>Contract type</Label>
            <Select allowEmpty placeholder="Select" value={form.contractType || ''} onChange={(v) => setForm({ ...form, contractType: v })} options={CONTRACT_TYPES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select allowEmpty placeholder="Select" value={form.priority || ''} onChange={(v) => setForm({ ...form, priority: v })} options={Object.keys(CLIENT_PRIORITY).map((k) => ({ value: k, label: k }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status || 'ACTIVE'} onChange={(v) => setForm({ ...form, status: v })} options={Object.keys(CLIENT_STATUS).map((k) => ({ value: k, label: CLIENT_STATUS[k].label }))} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}