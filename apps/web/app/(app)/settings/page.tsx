'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  User as UserIcon, Sliders, Save, Building2, Palette, Clock as ClockIcon,
} from 'lucide-react';
import { get, post, patch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { PageHeader, Loading } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { KPI_LABELS } from '@/lib/constants';

const KPI_KEYS = ['onTime', 'productivity', 'quality', 'revision', 'satisfaction', 'creativity', 'attendance', 'collaboration'];

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState<any>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProfile({ name: user?.name, phone: user?.phone });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isManager) return;
    get<any[]>('/settings/kpi').then((rows) => {
      const w: Record<string, number> = {};
      for (const r of rows) w[r.key] = r.weight;
      setWeights(w);
    }).catch(() => {});
    get<any>('/settings').then(setSettings).catch(() => {});
  }, [isManager]);

  if (loading) return <Loading />;

  const saveProfile = async () => {
    try {
      const updated = await patch<User>('/users/me', profile);
      setUser(updated);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveWeights = async () => {
    try {
      await post('/settings/kpi', weights);
      toast.success('KPI weights updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const totalWeight = Object.values(weights).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account preferences and workspace configuration" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'workspace', label: 'Workspace' },
          ...(isManager ? [{ value: 'kpi', label: 'KPI weights' }] : []),
        ]}
      />

      {tab === 'profile' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> Profile</CardTitle></CardHeader>
          <CardContent className="max-w-lg space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full name</Label><Input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Email (read-only)</Label><Input value={user?.email || ''} disabled /></div>
              <div><Label>Designation</Label><Input value={user?.designation || '—'} disabled /></div>
              <div><Label>Department</Label><Input value={user?.department?.name || '—'} disabled /></div>
            </div>
            <Button onClick={saveProfile}><Save className="h-4 w-4" /> Save changes</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'workspace' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Task type configuration</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(settings.taskTypes || []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Status & priorities</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Statuses</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {(settings.taskStatuses || []).map((s: string) => <Badge key={s} variant="secondary">{s.replace(/_/g, ' ')}</Badge>)}
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Priorities</p>
              <div className="flex flex-wrap gap-2">
                {(settings.priorities || []).map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'kpi' && isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sliders className="h-4 w-4" /> KPI weights</CardTitle>
            <p className="text-sm text-muted-foreground">Adjust the weight of each KPI. Sum should equal 100%.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {KPI_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-4">
                <span className="w-48 text-sm">{KPI_LABELS[k] || k}</span>
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={weights[k] ?? 0}
                    onChange={(e) => setWeights({ ...weights, [k]: +e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    className="w-16"
                    value={weights[k] ?? 0}
                    onChange={(e) => setWeights({ ...weights, [k]: +e.target.value })}
                  />
                  <span className="w-14 text-right text-sm font-medium">{weights[k] ?? 0}%</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm">Total weight</span>
              <span className={totalWeight === 100 ? 'font-bold text-emerald-500' : 'font-bold text-red-500'}>{totalWeight}%</span>
            </div>
            <Button onClick={saveWeights} disabled={totalWeight !== 100}><Save className="h-4 w-4" /> Save weights</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}