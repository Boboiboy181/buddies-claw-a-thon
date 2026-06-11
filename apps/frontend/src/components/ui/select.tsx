import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'border-input bg-background ring-offset-background focus-visible:ring-ring/30 flex h-10 w-full appearance-none rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
    </div>
  );
}

export { Select };
