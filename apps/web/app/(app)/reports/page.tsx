'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Download, FileSpreadsheet, File as FilePdf } from 'lucide-react';
import { get, authorizedFetch } from '@/lib/api';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { useFetch } from '@/lib/hooks';
import type { Client, User, Department } from '@/lib/types';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [type, setType] = useState('tasks');
  const [period, setPeriod] = useState('month');
  const [format, setFormat] = useState('csv');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data: clients } = useFetch<{ items: Client[] }>('/clients?perPage=200');
  const { data: employees } = useFetch<{ items: User[] }>('/users?perPage=200');
  const { data: departments } = useFetch<Department[]>('/departments');

  const download = async () => {
    const params = new URLSearchParams({ format, period, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    try {
      const res = await authorizedFetch(`${API_BASE}/reports/${type}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `creative-ops-${type}-${period}.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export tasks, employees and KPIs to PDF, Excel or CSV" />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Report builder</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Report type</p>
            <Tabs value={type} onChange={setType} tabs={[
              { value: 'tasks', label: 'Tasks' },
              { value: 'employees', label: 'Employees' },
              { value: 'kpi', label: 'KPI Leaderboard' },
            ]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Period</p>
              <Select value={period} onChange={setPeriod} options={PERIODS} />
            </div>
            {type === 'tasks' && (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Department</p>
                  <Select allowEmpty placeholder="All" value={filters.departmentId || ''} onChange={(v) => setFilters({ ...filters, departmentId: v })} options={(departments || []).map((d) => ({ value: d.id, label: d.name }))} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Client</p>
                  <Select allowEmpty placeholder="All" value={filters.clientId || ''} onChange={(v) => setFilters({ ...filters, clientId: v })} options={(clients?.items || []).map((c) => ({ value: c.id, label: c.name }))} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Employee</p>
                  <Select allowEmpty placeholder="All" value={filters.employeeId || ''} onChange={(v) => setFilters({ ...filters, employeeId: v })} options={(employees?.items || []).map((e) => ({ value: e.id, label: e.name }))} />
                </div>
              </>
            )}
            {type === 'tasks' && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Custom date range (overrides period)</p>
                <div className="flex items-center gap-2">
                  <Input type="date" value={filters.from || ''} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                  <span className="text-muted-foreground">→</span>
                  <Input type="date" value={filters.to || ''} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Export format</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormatCard active={format === 'csv'} onClick={() => setFormat('csv')} icon={<FileText className="h-5 w-5" />} title="CSV" desc="Raw data, opens in Excel/Sheets" />
              <FormatCard active={format === 'excel'} onClick={() => setFormat('excel')} icon={<FileSpreadsheet className="h-5 w-5 text-emerald-500" />} title="Excel" desc="Formatted .xlsx workbook" />
              <FormatCard active={format === 'pdf'} onClick={() => setFormat('pdf')} icon={<FilePdf className="h-5 w-5 text-red-500" />} title="PDF" desc="Print-ready document" />
            </div>
          </div>

          <Button size="lg" onClick={download} className="w-full sm:w-auto">
            <Download className="h-4 w-4" /> Download report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FormatCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40 hover:bg-accent'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
    </button>
  );
}