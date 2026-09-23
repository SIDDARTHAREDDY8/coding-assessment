import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold tracking-wide transition',
  {
    variants: {
      variant: {
        default: 'bg-stone-900 text-white',
        secondary: 'bg-stone-100 text-stone-800',
        destructive: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
        outline: 'border-stone-300 text-stone-700',
        approved:
          'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200',
        inProgress:
          'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
