import { useMemo } from 'react';
import { ArrowUpRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppSidebar, SHELL_HEADER_HEIGHT } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const sectionLabels = [
  { to: '/hr/dashboard', label: 'Dashboard' },
  { to: '/hr/jobs', label: 'Jobs' },
  { to: '/hr/interviews', label: 'Interviews' },
  { to: '/hr/candidates', label: 'Candidates' },
];

function HeaderActions() {
  const navigate = useNavigate();
  const { state } = useSidebar();

  return (
    <div className="hidden items-center gap-2 md:flex">
      <SidebarTrigger className="hidden bg-background/90 xl:inline-flex">
        {state === 'collapsed' ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </SidebarTrigger>
      <Button className="h-10 rounded-lg px-4 shadow-sm shadow-primary/15" onClick={() => navigate('/hr/interviews/new')}>
        New interview
        <ArrowUpRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

export default function HRLayout() {
  const location = useLocation();

  const currentSection = useMemo(
    () => sectionLabels.find((item) => location.pathname.startsWith(item.to)) ?? sectionLabels[0],
    [location.pathname]
  );

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <SidebarProvider
      defaultOpen
      className="min-h-screen bg-background"
    >
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur-xl">
          <div
            className={cn(
              'mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 md:px-6 xl:px-8',
              SHELL_HEADER_HEIGHT
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="xl:hidden" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">HR Workspace</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-xl font-semibold tracking-tight">{currentSection.label}</h2>
                  <span className="hidden rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm md:inline-flex">
                    {todayLabel}
                  </span>
                </div>
              </div>
            </div>

            <HeaderActions />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
