'use client';

import { Button } from '@/components/ui/button';

interface Lesson {
  id: string;
  title: string;
  content_type: string | null;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface ModuleEditorProps {
  modules: Module[];
  onAddModule: () => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string) => void;
}

export function ModuleEditor({
  modules,
  onAddModule,
  onDeleteModule,
  onAddLesson,
}: ModuleEditorProps) {
  return (
    <div className="space-y-4">
      {modules.length === 0 && (
        <p className="text-muted-foreground text-sm">No modules yet — add one below.</p>
      )}

      {modules.map((mod) => (
        <div key={mod.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{mod.title}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onAddLesson(mod.id)}>
                Add Lesson
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDeleteModule(mod.id)}>
                Delete
              </Button>
            </div>
          </div>

          {mod.lessons.length > 0 && (
            <ul className="mt-3 space-y-1 pl-4">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id} className="text-muted-foreground text-sm">
                  {lesson.order_index}. {lesson.title}
                  {lesson.content_type && (
                    <span className="ml-2 text-xs opacity-60">[{lesson.content_type}]</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={onAddModule}>
        Add Module
      </Button>
    </div>
  );
}
