import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBlock } from '@/components/page-block';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action that links somewhere (e.g. "/hr/jobs/new"). */
  action?: { label: string; to: string; icon?: LucideIcon };
}

/**
 * Consistent empty-state block for lists (jobs, candidates, question sets, …).
 * Wraps a dashed PageBlock with a centered icon, copy, and an optional CTA link.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <PageBlock variant="transparent">
      <CardHeader className="items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action ? (
          <Link to={action.to} className={buttonVariants({ className: 'mt-2 h-9 rounded-lg px-3' })}>
            {ActionIcon ? <ActionIcon data-icon="inline-start" /> : null}
            {action.label}
          </Link>
        ) : null}
      </CardHeader>
    </PageBlock>
  );
}
