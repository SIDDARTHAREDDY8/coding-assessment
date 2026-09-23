'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/spinner';
import { useActingAs } from '@/context/acting-as-context';
import {
  ApiError,
  approveDocument,
  rejectDocument,
  type DocumentDetail,
} from '@/lib/api';

function successMessage(
  action: 'approve' | 'reject',
  result: DocumentDetail,
): string {
  if (action === 'reject') {
    return 'Rejected. The creator can reopen the document to restart the workflow.';
  }
  if (result.status === 'APPROVED') {
    return 'Document approved.';
  }
  const nextStage = result.stages[result.currentStageIndex];
  return nextStage
    ? `Approved. Advanced to "${nextStage.name}".`
    : 'Approved. Advanced to the next stage.';
}

export function ApprovalActions({
  documentId,
  disabled = false,
}: {
  documentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { activeUserId } = useActingAs();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | null>(
    null,
  );
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function runApprove() {
    if (!activeUserId) {
      setError('Select a user in the top bar first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setBusyAction('approve');

    try {
      const result = await approveDocument(documentId, activeUserId);
      setSuccess(successMessage('approve', result));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not the approver for this stage.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('This document can no longer be approved in its current state.');
      } else {
        setError(err instanceof Error ? err.message : 'Action failed');
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function runReject() {
    if (!activeUserId) {
      setError('Select a user in the top bar first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setBusyAction('reject');

    try {
      const result = await rejectDocument(documentId, activeUserId, reason);
      setSuccess(successMessage('reject', result));
      setShowRejectForm(false);
      setReason('');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not the approver for this stage.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('This document can no longer be rejected in its current state.');
      } else {
        setError(err instanceof Error ? err.message : 'Action failed');
      }
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null || disabled;

  return (
    <div className="mt-4 space-y-3">
      {!showRejectForm ? (
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="success"
            disabled={busy || !activeUserId}
            onClick={runApprove}
            className="min-w-[7.5rem]"
          >
            {busyAction === 'approve' && <Spinner />}
            {busyAction === 'approve' ? 'Approving…' : 'Approve'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !activeUserId}
            onClick={() => {
              setError(null);
              setShowRejectForm(true);
            }}
            className="min-w-[7.5rem]"
          >
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <label
            htmlFor="reject-reason"
            className="block text-sm font-medium text-stone-700"
          >
            Reason for rejection{' '}
            <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="What needs to change before this can move forward?"
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !activeUserId}
              onClick={runReject}
              className="min-w-[7.5rem]"
            >
              {busyAction === 'reject' && <Spinner />}
              {busyAction === 'reject' ? 'Rejecting…' : 'Confirm rejection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowRejectForm(false);
                setReason('');
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {success && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <AlertDescription className="text-emerald-800">
            {success}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
