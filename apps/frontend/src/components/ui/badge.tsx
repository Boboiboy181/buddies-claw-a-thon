import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/12 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: "border-transparent bg-emerald-100 text-emerald-700 before:mr-1.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        warning: "border-transparent bg-amber-100 text-amber-700 before:mr-1.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        info: "border-transparent bg-sky-100 text-sky-700 before:mr-1.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        destructive: "border-transparent bg-red-100 text-red-700 before:mr-1.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
