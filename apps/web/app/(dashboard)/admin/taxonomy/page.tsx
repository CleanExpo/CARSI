'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Category {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
}

export default function TaxonomyPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', parent_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCategories() {
    try {
      const data = await apiClient.get<Category[]>('/api/lms/admin/categories');
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { slug: form.slug, name: form.name };
      if (form.parent_id) body.parent_id = form.parent_id;

      await apiClient.post('/api/lms/admin/categories', body);
      setShowForm(false);
      setForm({ slug: '', name: '', parent_id: '' });
      await fetchCategories();
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to create category';
      setError(detail);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(slug: string) {
    if (!confirm(`Delete category "${slug}"? Courses using it will be uncategorised.`)) return;
    await apiClient.delete(`/api/lms/admin/categories/${slug}`);
    await fetchCategories();
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // Separate root and child categories
  const roots = categories.filter((c) => !c.parent_id);
  const children = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Taxonomy</h1>
          <p className="text-muted-foreground text-sm">
            Manage categories used to organise courses.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Category'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-5">
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">Slug *</label>
                <input
                  className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                  placeholder="water-damage"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">Name *</label>
                <input
                  className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                  placeholder="Water Damage"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            {roots.length > 0 && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">Parent Category</label>
                <select
                  className="bg-muted w-full rounded-sm px-3 py-2 text-sm"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                >
                  <option value="">None (root category)</option>
                  {roots.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={createCategory} disabled={saving || !form.slug || !form.name}>
              {saving ? 'Saving…' : 'Create Category'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading categories…</p>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No categories yet. Create one to start organising courses.
        </p>
      ) : (
        <div className="space-y-2">
          {roots.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div>
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-muted-foreground ml-2 font-mono text-xs">{cat.slug}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deleteCategory(cat.slug)}
                >
                  Delete
                </Button>
              </CardHeader>
              {children(cat.id).length > 0 && (
                <CardContent className="border-t px-4 pt-3 pb-4">
                  <ul className="space-y-1">
                    {children(cat.id).map((child) => (
                      <li key={child.id} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="text-muted-foreground mr-2">└</span>
                          {child.name}
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            {child.slug}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteCategory(child.slug)}
                        >
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
