'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventRow } from '@/components/event-list';
import { LoadingBlock } from '@/components/loading-block';
import { Pager } from '@/components/pager';
import { getEvents, type DocumentEventItem, type Paginated } from '@/lib/api';

const PAGE_SIZE = 5;

export function AuditLog({
  documentId,
  initialEvents,
}: {
  documentId: string;
  initialEvents: Paginated<DocumentEventItem>;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (page === 1) {
      setData(initialEvents);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEvents({ documentId, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, page, initialEvents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading && page !== 1 ? (
          <div className="px-6 py-4">
            <LoadingBlock label="Loading events…" />
          </div>
        ) : error ? (
          <div className="px-6 pb-6">
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t load the audit log</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-stone-500">
            No events recorded for this document yet.
          </p>
        ) : (
          <div>
            <ul className="divide-y divide-stone-100">
              {data.items.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
            <div className="border-t border-stone-100">
              <Pager
                page={data.page}
                total={data.total}
                limit={PAGE_SIZE}
                loading={loading}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
