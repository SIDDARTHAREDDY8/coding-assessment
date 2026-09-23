'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/spinner';
import {
  StageEditor,
  newStageRow,
  type StageRow,
  type StageRowErrors,
} from '@/components/stage-editor';
import { useActingAs } from '@/context/acting-as-context';
import {
  ApiError,
  updateDocument,
  type DocumentDetail,
  type User,
} from '@/lib/api';

function validateStages(stages: StageRow[]): {
  rowErrors: Record<string, StageRowErrors>;
  generalError?: string;
} {
  const rowErrors: Record<string, StageRowErrors> = {};
  stages.forEach((row) => {
    const errors: StageRowErrors = {};
    if (!row.name.trim()) errors.name = 'Stage name is required.';
    if (!row.approverId) errors.approverId = 'Select an approver.';
    if (errors.name || errors.approverId) {
      rowErrors[row.key] = errors;
    }
  });
  return {
    rowErrors,
    generalError: stages.length === 0 ? 'Add at least one stage.' : undefined,
  };
}

export function EditDocumentForm({
  document,
  users,
}: {
  document: DocumentDetail;
  users: User[];
}) {
  const router = useRouter();
  const { activeUserId } = useActingAs();
  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [stages, setStages] = useState<StageRow[]>(() =>
    document.stages.map((stage) =>
      newStageRow(stage.name, stage.approver.id),
    ),
  );
  const [titleError, setTitleError] = useState<string | undefined>();
  const [bodyError, setBodyError] = useState<string | undefined>();
  const [rowErrors, setRowErrors] = useState<Record<string, StageRowErrors>>({});
  const [stagesGeneralError, setStagesGeneralError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreator =
    activeUserId !== '' && document.createdBy?.id === activeUserId;

  if (!isCreator) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Not allowed</AlertTitle>
        <AlertDescription>
          Only the creator of this document can edit it. Switch the
          &ldquo;Acting as&rdquo; user in the top bar to{' '}
          {document.createdBy ? document.createdBy.name : 'the creator'}.
        </AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    let valid = true;
    if (!title.trim()) {
      setTitleError('Title is required.');
      valid = false;
    } else {
      setTitleError(undefined);
    }
    if (!body.trim()) {
      setBodyError('Body is required.');
      valid = false;
    } else {
      setBodyError(undefined);
    }

    const { rowErrors: nextRowErrors, generalError } = validateStages(stages);
    setRowErrors(nextRowErrors);
    setStagesGeneralError(generalError);
    if (Object.keys(nextRowErrors).length > 0 || generalError) {
      valid = false;
    }

    if (!valid) return;

    setSubmitting(true);
    try {
      await updateDocument(document.id, {
        userId: activeUserId,
        title: title.trim(),
        body: body.trim(),
        stages: stages.map((row) => ({
          name: row.name.trim(),
          approverId: row.approverId,
        })),
      });
      router.push(`/documents/${document.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError('Only the creator of this document can edit it.');
      } else {
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to update document',
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <label htmlFor="edit-title" className="field-label">
              Title
            </label>
            <input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={submitting}
              className={`input mt-1.5 ${titleError ? 'input-error' : ''}`}
              aria-invalid={Boolean(titleError)}
            />
            {titleError && <span className="field-error">{titleError}</span>}
          </div>

          <div>
            <label htmlFor="edit-body" className="field-label">
              Body
            </label>
            <Textarea
              id="edit-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={submitting}
              rows={7}
              className={`mt-1.5 ${bodyError ? 'border-red-400 focus:border-red-500' : ''}`}
              aria-invalid={Boolean(bodyError)}
            />
            {bodyError && <span className="field-error">{bodyError}</span>}
          </div>

          <div className="space-y-4 border-t border-stone-100 pt-6">
            <div>
              <p className="section-label">Approval stages</p>
              <p className="field-hint mt-1">
                Changing stages resets the workflow to the first stage.
              </p>
            </div>
            <StageEditor
              users={users}
              stages={stages}
              onChange={setStages}
              rowErrors={rowErrors}
              generalError={stagesGeneralError}
              disabled={submitting}
            />
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t update the document</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 border-t border-stone-100 pt-6">
            <Button type="submit" disabled={submitting} className="min-w-[10rem]">
              {submitting && <Spinner />}
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button asChild variant="outline" disabled={submitting}>
              <Link href={`/documents/${document.id}`}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
