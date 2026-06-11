import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const pageBlockVariants = cva('border', {
  variants: {
    variant: {
      default: 'border-border/80 bg-white/92',
      dashed: 'border-border/70 border-dashed bg-white/88',
      transparent: 'border-border/70 border-dashed bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function PageBlock({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof Card> & VariantProps<typeof pageBlockVariants>) {
  return <Card className={cn(pageBlockVariants({ variant }), className)} {...props} />;
}

export { PageBlock };
