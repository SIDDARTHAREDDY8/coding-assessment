'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateTime } from '@/lib/format';
import { getEvents, type DocumentEventItem } from '@/lib/api';

export function DeclineBanner({ documentId }: { documentId: string }) {
  const [rejections, setRejections] = useState<DocumentEventItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Newest first; a generous limit so the full rejection history shows.
    getEvents({ documentId, page: 1, limit: 100 })
      .then((result) => {
        if (!cancelled) {
          setRejections(
            result.items.filter((event) => event.action === 'REJECTED'),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRejections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const latest = rejections?.[0] ?? null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTitle>
        Document declined
        {latest?.stageName ? ` at stage "${latest.stageName}"` : ''}
      </AlertTitle>
      <AlertDescription>
        {latest?.reason ? (
          <p className="mt-1 italic">&ldquo;{latest.reason}&rdquo;</p>
        ) : (
          <p className="mt-1">No reason was provided.</p>
        )}

        {rejections !== null && rejections.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium underline-offset-2 hover:underline">
              Decline history ({rejections.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {rejections.map((event) => (
                <li
                  key={event.id}
                  className="rounded-md bg-white/60 px-3 py-2 ring-1 ring-inset ring-red-200/60"
                >
                  <div className="text-sm font-medium text-red-900">
                    {event.stageName ?? 'Unknown stage'}
                  </div>
                  {event.reason && (
                    <div className="mt-0.5 text-sm italic text-red-800">
                      &ldquo;{event.reason}&rdquo;
                    </div>
                  )}
                  <div className="mt-1 text-xs text-red-700/80">
                    {event.actor ? event.actor.name : 'System'} —{' '}
                    {formatDateTime(event.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}
