'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FolderOpen, Upload, File, Image, FileText, FileArchive, Film, Download, Trash2, Folder,
} from 'lucide-react';
import { get, post, del, api, API_BASE } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, formatBytes, timeAgo } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface FileAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  folder: string;
  clientId?: string | null;
  createdAt: string;
  uploadedBy?: { name: string; avatar?: string | null } | null;
  client?: { name: string } | null;
}

const FOLDERS = ['General', 'Creative', 'Videos', 'PSD', 'AI', 'XD', 'Figma', 'Brand Guidelines', 'Presentation'];

export default function FilesPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [folders, setFolders] = useState<{ name: string; count: number }[]>([]);
  const [folder, setFolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (folder) q.set('folder', folder);
      const [f, fo] = await Promise.all([
        get<FileAsset[]>(`/files?${q.toString()}`),
        get<{ name: string; count: number }[]>('/files/folders'),
      ]);
      setFiles(f);
      setFolders(fo);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [folder]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder || 'General');
      await api('/files/upload', { method: 'POST', formData: fd });
      toast.success('File uploaded');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const remove = async (f: FileAsset) => {
    if (!confirm(`Delete "${f.name}"?`)) return;
    try {
      await del(`/files/${f.id}`);
      toast.success('File deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const iconFor = (mime: string, name: string) => {
    if (mime.startsWith('image/')) return <Image className="h-6 w-6 text-emerald-500" />;
    if (mime.startsWith('video/')) return <Film className="h-6 w-6 text-rose-500" />;
    if (mime.includes('zip') || mime.includes('rar')) return <FileArchive className="h-6 w-6 text-amber-500" />;
    if (name.endsWith('.pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (name.endsWith('.psd')) return <Folder className="h-6 w-6 text-blue-500" />;
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="File Manager" description="Creative files, brand guidelines and deliverables">
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={upload} />
          <Button disabled={uploading} className="pointer-events-none">{uploading ? 'Uploading…' : 'Upload'}<Upload className="h-4 w-4" /></Button>
        </label>
      </PageHeader>

      {/* Folders */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFolder('')}
          className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors', !folder ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}
        >
          <FolderOpen className="h-4 w-4" /> All ({files.length || 0})
        </button>
        {FOLDERS.map((f) => {
          const count = folders.find((x) => x.name === f)?.count || 0;
          return (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors', folder === f ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent')}
            >
              <Folder className="h-4 w-4" /> {f} {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : files.length === 0 ? (
        <EmptyState title="No files here" description="Upload creative assets, brand guidelines and deliverables." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => (
            <Card key={f.id} className="group p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/60">{iconFor(f.mimeType, f.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(f.size)} · {timeAgo(f.createdAt)}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{f.folder}</Badge>
                    {f.client && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{f.client.name}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                <div className="flex items-center gap-1.5">
                  <Avatar name={f.uploadedBy?.name} src={f.uploadedBy?.avatar} size="sm" />
                  <span className="text-[11px] text-muted-foreground">{f.uploadedBy?.name || '—'}</span>
                </div>
                <div className="flex gap-1">
                  <a href={`${API_BASE}${f.url}`} target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </a>
                  {isManager && (
                    <button onClick={() => remove(f)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}