import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/format';
import { getDocument, getEvents, type DocumentDetail } from '@/lib/api';
import { AuditLog } from './audit-log';
import { DeclineBanner } from './decline-banner';
import { DocumentActions } from './document-actions';

type Props = {
  params: Promise<{ id: string }>;
};

type StageState = 'done' | 'current' | 'declined' | 'pending';

function stageState(document: DocumentDetail, index: number): StageState {
  if (document.status === 'APPROVED') return 'done';
  if (index < document.currentStageIndex) return 'done';
  if (index === document.currentStageIndex) {
    return document.status === 'DECLINED' ? 'declined' : 'current';
  }
  return 'pending';
}

function StageStateBadge({ state }: { state: StageState }) {
  if (state === 'done') {
    return <Badge variant="approved">Passed</Badge>;
  }
  if (state === 'current') {
    return <Badge variant="secondary">Current</Badge>;
  }
  if (state === 'declined') {
    return <Badge variant="destructive">Declined</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;

  let document: DocumentDetail;
  let initialEvents;
  try {
    [document, initialEvents] = await Promise.all([
      getDocument(id),
      getEvents({ documentId: id, page: 1, limit: 5 }),
    ]);
  } catch {
    notFound();
  }

  const currentStage =
    document.status === 'APPROVED'
      ? null
      : (document.stages[document.currentStageIndex] ?? null);

  return (
    <div>
      <Link href="/" className="back-link">
        ← Documents
      </Link>

      {document.status === 'DECLINED' && (
        <div className="mt-5">
          <DeclineBanner documentId={document.id} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-8 md:grid-cols-3">
        <div className="min-w-0 space-y-8 md:col-span-2">
          <Card className="overflow-hidden border-t-2 border-t-stone-800">
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-stone-100 px-6 py-6 sm:px-8">
              <div className="min-w-0">
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <p className="page-subtitle">
                  {document.status === 'APPROVED'
                    ? 'Fully approved'
                    : document.status === 'DECLINED'
                      ? 'Declined — awaiting reopen'
                      : currentStage
                        ? `Current stage: ${currentStage.name}`
                        : 'In progress'}
                </p>
              </div>
              <StatusBadge status={document.status} />
            </CardHeader>

            <section className="border-b border-stone-100 px-6 py-8 sm:px-8 sm:py-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Body
              </h2>
              <p className="mt-4 max-w-[70ch] whitespace-pre-wrap text-base leading-8 text-stone-800">
                {document.body}
              </p>
            </section>

            <section className="px-6 py-6 sm:px-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Details
              </h2>
              <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-stone-400">
                    Created by
                  </dt>
                  <dd className="mt-1 text-sm text-stone-800">
                    {document.createdBy
                      ? `${document.createdBy.name} (${document.createdBy.email})`
                      : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-400">Created</dt>
                  <dd className="mt-1 text-sm text-stone-800">
                    {formatDate(document.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-400">
                    Last updated
                  </dt>
                  <dd className="mt-1 text-sm text-stone-800">
                    {formatDate(document.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-400">
                    Document ID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-stone-500">
                    {document.id}
                  </dd>
                </div>
              </dl>
            </section>
          </Card>

          <AuditLog documentId={document.id} initialEvents={initialEvents} />
        </div>

        <aside className="min-w-0 space-y-6 md:sticky md:top-20 md:col-span-1">
          <section>
            <h2 className="section-label mb-3">Stages</h2>
            <ol className="space-y-3">
              {document.stages.map((stage, index) => {
                const state = stageState(document, index);
                return (
                  <li
                    key={stage.id}
                    className={`card px-5 py-4 ${
                      state === 'current' ? 'border-stone-900 shadow-md' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-stone-900">
                          {index + 1}. {stage.name}
                        </div>
                        <div className="mt-0.5 text-sm text-stone-600">
                          Approver: {stage.approver.name}
                        </div>
                      </div>
                      <StageStateBadge state={state} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <DocumentActions document={document} />
        </aside>
      </div>
    </div>
  );
}
