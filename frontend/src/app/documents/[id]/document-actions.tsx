'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActingAs } from '@/context/acting-as-context';
import type { DocumentDetail } from '@/lib/api';
import { ApprovalActions } from './approval-actions';
import { ReopenButton } from './reopen-button';

export function DocumentActions({ document }: { document: DocumentDetail }) {
  const { activeUserId } = useActingAs();
  const isCreator =
    activeUserId !== '' && document.createdBy?.id === activeUserId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="-mt-3">
        {document.status === 'APPROVED' ? (
          <div className="rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-100">
            This document is fully approved. No further actions are available.
          </div>
        ) : document.status === 'DECLINED' ? (
          <div>
            <p className="text-sm text-stone-500">
              This document was declined. Reopening returns it to the first
              stage.
            </p>
            <ReopenButton documentId={document.id} />
          </div>
        ) : (
          <ApprovalActions documentId={document.id} />
        )}

        {isCreator && (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/documents/${document.id}/edit`}>Edit document</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
