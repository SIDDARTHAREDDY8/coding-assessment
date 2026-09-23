'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { LoadingBlock } from '@/components/loading-block';
import { Pager } from '@/components/pager';
import { Spinner } from '@/components/spinner';
import { StatusBadge } from '@/components/status-badge';
import { useActingAs } from '@/context/acting-as-context';
import {
  getDocuments,
  type DocumentSummary,
  type Paginated,
} from '@/lib/api';

const PAGE_SIZE = 6;

type TabKey = 'all' | 'to-review' | 'mine';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All documents' },
  { key: 'to-review', label: 'To review' },
  { key: 'mine', label: 'Mine' },
];

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  return (
    <li>
      <Link
        href={`/documents/${doc.id}`}
        className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-stone-50/80 sm:px-6"
      >
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-stone-900 group-hover:text-stone-950">
            {doc.title}
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {doc.status === 'APPROVED'
              ? 'All stages approved'
              : `${doc.currentStageName} — ${doc.currentApproverName}`}
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </Link>
    </li>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  if (tab === 'to-review') {
    return (
      <div className="empty-state">
        <p className="text-base font-medium text-stone-800">
          Nothing waiting for your review
        </p>
        <p className="mt-1.5 max-w-sm text-sm text-stone-500">
          Documents where you are the current stage approver will show up here.
        </p>
      </div>
    );
  }
  if (tab === 'mine') {
    return (
      <div className="empty-state">
        <p className="text-base font-medium text-stone-800">
          You haven&apos;t created any documents yet
        </p>
        <p className="mt-1.5 max-w-sm text-sm text-stone-500">
          Documents you create will appear here.
        </p>
        <Button asChild className="mt-5">
          <Link href="/new">Create document</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <p className="text-base font-medium text-stone-800">No documents yet</p>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">
        Create a document and assign an approver for each stage to get started.
      </p>
      <Button asChild className="mt-5">
        <Link href="/new">Create document</Link>
      </Button>
    </div>
  );
}

function TabPane({ tab, userId }: { tab: TabKey; userId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DocumentSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDocuments({
      page,
      limit: PAGE_SIZE,
      currentApproverId: tab === 'to-review' ? userId : undefined,
      createdById: tab === 'mine' ? userId : undefined,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load documents');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab, userId, page]);

  if (loading && !data) {
    return <LoadingBlock label="Loading documents…" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load documents</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return <EmptyState tab={tab} />;
  }

  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {items.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
      </ul>
      {loading && (
        <div className="flex items-center gap-2 px-5 py-3 text-sm text-stone-500 sm:px-6">
          <Spinner /> Refreshing…
        </div>
      )}
      <div className="border-t border-stone-100">
        <Pager
          page={data?.page ?? page}
          total={data?.total ?? 0}
          limit={PAGE_SIZE}
          loading={loading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { activeUserId } = useActingAs();
  const [tab, setTab] = useState<TabKey>('all');

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            Track each document through its approval stages.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/new">New document</Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabKey)}
        className="mt-6"
      >
        <TabsList aria-label="Document lists">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            <Card className="mt-4 overflow-hidden">
              <CardContent className="p-0">
                {tab === t.key && (
                  <TabPane
                    key={`${t.key}:${activeUserId}`}
                    tab={t.key}
                    userId={activeUserId}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
