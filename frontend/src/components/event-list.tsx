import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import type { DocumentEventAction, DocumentEventItem } from '@/lib/api';

export const EVENT_ACTION_LABELS: Record<DocumentEventAction, string> = {
  CREATED: 'Created',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REOPENED: 'Reopened',
  UPDATED: 'Updated',
  STAGES_UPDATED: 'Stages updated',
};

function eventBadgeVariant(
  action: DocumentEventAction,
): 'approved' | 'destructive' | 'secondary' {
  if (action === 'APPROVED') return 'approved';
  if (action === 'REJECTED') return 'destructive';
  return 'secondary';
}

export function EventActionBadge({ action }: { action: DocumentEventAction }) {
  return (
    <Badge variant={eventBadgeVariant(action)}>{EVENT_ACTION_LABELS[action]}</Badge>
  );
}

export function EventRow({ event }: { event: DocumentEventItem }) {
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <EventActionBadge action={event.action} />
          <span className="text-sm font-medium text-stone-900">
            {event.actor ? event.actor.name : 'System'}
          </span>
          {event.stageName && (
            <span className="text-sm text-stone-500">
              at stage &ldquo;{event.stageName}&rdquo;
            </span>
          )}
        </div>
        <div className="mt-1.5 text-sm text-stone-500">
          {event.actor
            ? `${event.actor.name} (${event.actor.email})`
            : 'Recorded by the system'}
        </div>
        {event.reason && (
          <p className="mt-1.5 max-w-[70ch] text-sm italic text-stone-600">
            &ldquo;{event.reason}&rdquo;
          </p>
        )}
      </div>
      <time className="shrink-0 text-xs text-stone-400">
        {formatDateTime(event.createdAt)}
      </time>
    </li>
  );
}
