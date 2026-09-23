import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type DocumentStatus } from '@/lib/api';

const STATUS_VARIANTS: Record<
  DocumentStatus,
  'approved' | 'inProgress' | 'destructive'
> = {
  APPROVED: 'approved',
  IN_PROGRESS: 'inProgress',
  DECLINED: 'destructive',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
