'use client';

import { Button } from '@/components/ui/button';
import type { User } from '@/lib/api';

export type StageRow = {
  key: string;
  name: string;
  approverId: string;
};

export type StageRowErrors = {
  name?: string;
  approverId?: string;
};

type StageEditorProps = {
  users: User[];
  stages: StageRow[];
  onChange: (stages: StageRow[]) => void;
  rowErrors?: Record<string, StageRowErrors>;
  generalError?: string;
  disabled?: boolean;
};

let keyCounter = 0;
export function newStageRow(name = '', approverId = ''): StageRow {
  keyCounter += 1;
  return { key: `stage-${Date.now()}-${keyCounter}`, name, approverId };
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function StageEditor({
  users,
  stages,
  onChange,
  rowErrors = {},
  generalError,
  disabled = false,
}: StageEditorProps) {
  function updateRow(index: number, patch: Partial<StageRow>) {
    onChange(stages.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {stages.map((row, index) => {
          const errors = rowErrors[row.key] ?? {};
          return (
            <li
              key={row.key}
              className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Stage {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || index === 0}
                    onClick={() => onChange(move(stages, index, index - 1))}
                    aria-label={`Move stage ${index + 1} up`}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || index === stages.length - 1}
                    onClick={() => onChange(move(stages, index, index + 1))}
                    aria-label={`Move stage ${index + 1} down`}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || stages.length <= 1}
                    onClick={() =>
                      onChange(stages.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove stage ${index + 1}`}
                    className="text-red-700 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="field">
                  <span className="field-label">Stage name</span>
                  <input
                    value={row.name}
                    onChange={(event) =>
                      updateRow(index, { name: event.target.value })
                    }
                    disabled={disabled}
                    placeholder="e.g. Draft Review"
                    className={`input ${errors.name ? 'input-error' : ''}`}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && (
                    <span className="field-error">{errors.name}</span>
                  )}
                </label>

                <label className="field">
                  <span className="field-label">Approver</span>
                  <select
                    value={row.approverId}
                    onChange={(event) =>
                      updateRow(index, { approverId: event.target.value })
                    }
                    disabled={disabled}
                    className={`input ${errors.approverId ? 'input-error' : ''}`}
                    aria-invalid={Boolean(errors.approverId)}
                  >
                    <option value="">Select an approver…</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {errors.approverId && (
                    <span className="field-error">{errors.approverId}</span>
                  )}
                </label>
              </div>
            </li>
          );
        })}
      </ol>

      {generalError && <p className="field-error">{generalError}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...stages,
            newStageRow('', users[0]?.id ?? ''),
          ])
        }
      >
        + Add stage
      </Button>
    </div>
  );
}
