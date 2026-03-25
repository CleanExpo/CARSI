'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface CourseFormValues {
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  price_aud?: number;
  is_free?: boolean;
  level?: string;
  category?: string;
  iicrc_discipline?: string;
  cec_hours?: number;
}

interface CourseBuilderProps {
  onSubmit: (values: CourseFormValues) => void;
  initialValues?: CourseFormValues;
}

export function CourseBuilder({ onSubmit, initialValues }: CourseBuilderProps) {
  const [values, setValues] = useState<CourseFormValues>({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    price_aud: 0,
    is_free: false,
    level: 'beginner',
    category: '',
    iicrc_discipline: '',
    cec_hours: 0,
    ...initialValues,
  });

  function set(field: keyof CourseFormValues, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={values.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Water Damage Restoration Fundamentals"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={values.slug ?? ''}
          onChange={(e) => set('slug', e.target.value)}
          placeholder="e.g. water-damage-restoration-fundamentals"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price_aud">Price (AUD)</Label>
          <Input
            id="price_aud"
            type="number"
            min={0}
            step={0.01}
            value={values.price_aud ?? 0}
            onChange={(e) => set('price_aud', parseFloat(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            value={values.level ?? 'beginner'}
            onChange={(e) => set('level', e.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="iicrc_discipline">IICRC Discipline</Label>
          <Input
            id="iicrc_discipline"
            value={values.iicrc_discipline ?? ''}
            onChange={(e) => set('iicrc_discipline', e.target.value)}
            placeholder="e.g. WRT"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cec_hours">CEC Hours</Label>
          <Input
            id="cec_hours"
            type="number"
            min={0}
            step={0.5}
            value={values.cec_hours ?? 0}
            onChange={(e) => set('cec_hours', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <Button type="submit">Save Course</Button>
    </form>
  );
}
