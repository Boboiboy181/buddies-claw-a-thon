import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring/30 flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-[color,box-shadow] outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Input };
