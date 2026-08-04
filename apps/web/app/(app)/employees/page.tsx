'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { get, post, patch, del } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import type { User, Department } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const DESIGNATIONS = ['Creative Director', 'Sr. Graphic Designer', 'Motion Designer', 'Brand Designer', 'UI/UX Designer', 'Social Media Executive', 'SEO Specialist', 'Frontend Developer', 'Account Executive', 'Copywriter'];

export default function EmployeesPage() {
  const [tab, setTab] = useState('employees');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([get<{ items: User[] }>('/users?perPage=200'), get<Department[]>('/departments')]);
      setUsers(u.items);
      setDepartments(d);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required');
    try {
      await post('/users', form);
      toast.success('Employee created');
      setCreateOpen(false);
      setForm({});
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (u: User) => {
    if (!confirm(`Remove ${u.name}? This deletes their account.`)) return;
    try {
      await del(`/users/${u.id}`);
      toast.success('Employee removed');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (tab === 'departments') {
    return <DepartmentsView departments={departments} onChange={load} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage your team, roles and departments">
        <Button onClick={() => { setForm({ role: 'EMPLOYEE', status: 'ACTIVE', workingHoursPerDay: 8 }); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Add employee
        </Button>
      </PageHeader>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'employees', label: 'Employees' }, { value: 'departments', label: 'Departments' }]} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No employees yet" description="Add your first team member to get started." />
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatar} />
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.designation || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.department?.name || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'MANAGER' ? 'default' : 'secondary'}>{u.role === 'MANAGER' ? 'Manager' : 'Employee'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.joinedAt)}</TableCell>
                  <TableCell>
                    {u.role !== 'MANAGER' && (
                      <Button variant="ghost" size="iconSm" onClick={() => remove(u)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add employee"
        description="Create a login for a new team member"
        footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Full name *</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Work email *</Label><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Password *</Label><Input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
          <div>
            <Label>Department</Label>
            <Select allowEmpty placeholder="Select" value={form.departmentId || ''} onChange={(v) => setForm({ ...form, departmentId: v })} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          </div>
          <div>
            <Label>Designation</Label>
            <Select allowEmpty placeholder="Select" value={form.designation || ''} onChange={(v) => setForm({ ...form, designation: v })} options={DESIGNATIONS.map((d) => ({ value: d, label: d }))} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role || 'EMPLOYEE'} onChange={(v) => setForm({ ...form, role: v })} options={[{ value: 'EMPLOYEE', label: 'Employee' }, { value: 'MANAGER', label: 'Manager' }]} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function DepartmentsView({ departments, onChange }: { departments: Department[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const create = async () => {
    if (!form.name) return toast.error('Department name is required');
    try {
      await post('/departments', form);
      toast.success('Department created');
      setOpen(false);
      setForm({});
      onChange();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    try {
      await del(`/departments/${d.id}`);
      toast.success('Department deleted');
      onChange();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New department</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <div key={d.id} className="glass-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: d.color || '#8b5cf6' }}>
                {d.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d._count?.users ?? 0} members</p>
              </div>
            </div>
            {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
            <button onClick={() => remove(d)} className="mt-3 flex items-center gap-1 text-xs text-destructive hover:underline">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New department"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}
      >
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Motion" /></div>
          <div><Label>Description</Label><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {['#8b5cf6', '#ec4899', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'].map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-lg border-2 ${form.color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}