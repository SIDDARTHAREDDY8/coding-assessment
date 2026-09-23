'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { EventRow } from '@/components/event-list';
import { LoadingBlock } from '@/components/loading-block';
import { Pager } from '@/components/pager';
import { getEvents, type DocumentEventItem, type Paginated } from '@/lib/api';

const PAGE_SIZE = 10;

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DocumentEventItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getEvents({ page, limit: PAGE_SIZE })
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
  }, [page]);

  return (
    <div>
      <h1 className="page-title">Audit log</h1>
      <p className="page-subtitle">
        Every workflow event across all documents, newest first.
      </p>

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="px-6 py-4">
              <LoadingBlock label="Loading audit log…" />
            </div>
          ) : error ? (
            <div className="px-6 py-6">
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t load the audit log</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : data && data.items.length > 0 ? (
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
          ) : (
            <p className="px-6 py-14 text-center text-sm text-stone-500">
              No events recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
