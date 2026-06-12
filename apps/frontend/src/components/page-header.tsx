import * as React from 'react';

import { cn } from '@/lib/utils';

type PageHeaderVariant = 'card' | 'plain';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  variant?: PageHeaderVariant;
}

const variantClasses: Record<PageHeaderVariant, string> = {
  card: 'flex flex-col gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between',
  plain: 'flex flex-col gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-start lg:justify-between',
};

const contentVariantClasses: Record<PageHeaderVariant, string> = {
  card: '',
  plain: 'flex flex-col gap-2',
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  variant = 'card',
}: PageHeaderProps) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      <div className={cn(contentVariantClasses[variant], contentClassName)}>
        <h1 className={cn('font-heading text-3xl font-semibold tracking-tight md:text-[2rem]', titleClassName)}>{title}</h1>
        {description ? <p className={cn('text-muted-foreground mt-2 max-w-2xl leading-6', variant === 'plain' && 'mt-0', descriptionClassName)}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
