'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Pathway {
  id: string;
  slug: string;
  title: string;
  iicrc_discipline?: string | null;
  target_certification?: string | null;
  estimated_hours?: string | null;
  is_published: boolean;
  order_index: number;
}

export default function AdminPathwaysPage() {
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', iicrc_discipline: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function fetchPathways() {
    // Admin endpoint returns all pathways (published and draft)
    // Fall back to public endpoint for now — extend later with an admin list
    try {
      const data = await apiClient.get<{ items: Pathway[] }>('/api/lms/pathways');
      setPathways(data.items ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  async function createPathway() {
    setSaving(true);
    try {
      await apiClient.post('/api/lms/admin/pathways', {
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        iicrc_discipline: form.iicrc_discipline || null,
      });
      setShowForm(false);
      setForm({ slug: '', title: '', iicrc_discipline: '', description: '' });
      await fetchPathways();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(slug: string, current: boolean) {
    await apiClient.patch(`/api/lms/admin/pathways/${slug}`, { is_published: !current });
    await fetchPathways();
  }

  useEffect(() => {
    fetchPathways();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Learning Pathways</h1>
          <p className="text-muted-foreground text-sm">Manage IICRC certification journeys.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Pathway'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">Slug *</label>
                <input
                  className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                  placeholder="wrt-foundation"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">IICRC Discipline</label>
                <select
                  className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                  value={form.iicrc_discipline}
                  onChange={(e) => setForm({ ...form, iicrc_discipline: e.target.value })}
                >
                  <option value="">None</option>
                  {['WRT', 'CRT', 'OCT', 'ASD', 'CCT'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Title *</label>
              <input
                className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                placeholder="Water Damage Restoration Pathway"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Description</label>
              <textarea
                className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button onClick={createPathway} disabled={saving || !form.slug || !form.title}>
              {saving ? 'Saving…' : 'Create Pathway'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading pathways…</p>
      ) : pathways.length === 0 ? (
        <p className="text-muted-foreground text-sm">No pathways yet.</p>
      ) : (
        <div className="space-y-2">
          {pathways.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{p.title}</span>
                  {p.iicrc_discipline && <Badge variant="outline">{p.iicrc_discipline}</Badge>}
                  <span className="text-muted-foreground font-mono text-xs">{p.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${p.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                  >
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublish(p.slug, p.is_published)}
                  >
                    {p.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
