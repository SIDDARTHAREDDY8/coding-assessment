'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { useActingAs } from '@/context/acting-as-context';
import { ApiError, reopenDocument } from '@/lib/api';

export function ReopenButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { activeUserId } = useActingAs();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onReopen() {
    if (!activeUserId) {
      setError('Select a user in the top bar first.');
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await reopenDocument(documentId, activeUserId);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Only the creator or the first stage approver can reopen this document.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('This document cannot be reopened in its current state.');
      } else {
        setError(err instanceof Error ? err.message : 'Reopen failed');
      }
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={busy || !activeUserId}
        onClick={onReopen}
        className="min-w-[10rem]"
      >
        {busy && <Spinner />}
        {busy ? 'Reopening…' : 'Reopen document'}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
