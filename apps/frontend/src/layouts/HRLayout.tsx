import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Users,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  PanelLeft,
  Search,
  Bell,
  ArrowUpRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard', hint: 'Overview and live pipeline' },
  { to: '/hr/jobs', icon: Briefcase, label: 'Jobs', hint: 'Role briefs and scorecards' },
  { to: '/hr/interviews', icon: CalendarDays, label: 'Interviews', hint: 'Sessions, reports, recordings' },
  { to: '/hr/candidates', icon: Users, label: 'Candidates', hint: 'Profiles and activity history' },
] satisfies Array<{ to: string; icon: LucideIcon; label: string; hint: string }>;

function AppSidebar({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur">
      <div className="border-sidebar-border border-b px-5 py-5">
        <div className={cn('mb-4 flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Briefcase className="size-5" />
          </div>
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <h1 className="font-heading truncate text-base font-semibold tracking-tight">HR Interview</h1>
            <p className="text-sidebar-foreground/65 text-xs">dashboard-01 style workspace</p>
          </div>
        </div>
        <div className={cn('rounded-2xl border border-sidebar-border/80 bg-background/80 p-3 shadow-sm', collapsed && 'p-2.5')}>
          <div className={cn('mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary', collapsed && 'mb-0 justify-center')}>
            <Sparkles className="size-3.5" />
            <span className={cn(collapsed && 'hidden')}>Hiring Ops</span>
          </div>
          <p className={cn('text-sm leading-6 text-foreground/75', collapsed && 'hidden')}>
            Keep hiring loops, candidates, and AI-generated reports in one focused workspace.
          </p>
        </div>
      </div>

      <div className={cn('px-3 py-4', collapsed && 'hidden')}>
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/45">Workspace</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, icon: Icon, label, hint }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'border-primary/20 bg-primary/10 text-foreground shadow-sm'
                  : 'border-transparent text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    isActive
                      ? 'border-primary/20 bg-primary text-primary-foreground'
                      : 'border-sidebar-border bg-background/80 text-sidebar-foreground/75 group-hover:border-transparent group-hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className={cn('min-w-0', collapsed && 'hidden')}>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">{hint}</p>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-sidebar-border mt-6 border-t px-4 py-5">
        <div className={cn('mb-4 rounded-2xl border border-sidebar-border/80 bg-background/85 p-3 shadow-sm', collapsed && 'p-2')}>
          <div className={cn('mb-3 flex items-center gap-3', collapsed && 'mb-0 justify-center')}>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? 'H'}
            </div>
            <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className={cn('rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground', collapsed && 'hidden')}>
            Recruiter workspace is synced with live interviews and reporting status.
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="outline"
          title={collapsed ? 'Logout' : undefined}
          className={cn('h-10 w-full justify-start gap-2 rounded-xl bg-background/90', collapsed && 'justify-center px-0')}
        >
          <LogOut className="size-4" />
          <span className={cn(collapsed && 'hidden')}>Logout</span>
        </Button>

        {onToggleCollapse ? (
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('mt-2 h-10 w-full justify-start gap-2 rounded-xl', collapsed && 'justify-center px-0')}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            <span className={cn(collapsed && 'hidden')}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function HRLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const currentSection = useMemo(
    () => navItems.find((item) => location.pathname.startsWith(item.to)) ?? navItems[0],
    [location.pathname]
  );

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_18%),linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(248,250,252,1)_100%)]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'hidden shrink-0 border-r border-sidebar-border/80 transition-[width] duration-200 xl:block',
            desktopSidebarCollapsed ? 'w-24' : 'w-80'
          )}
        >
          <div className="sticky top-0 h-screen">
            <AppSidebar
              collapsed={desktopSidebarCollapsed}
              onToggleCollapse={() => setDesktopSidebarCollapsed((value) => !value)}
            />
          </div>
        </aside>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-[86vw] max-w-80 border-r border-sidebar-border bg-sidebar shadow-2xl">
              <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-xl xl:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <PanelLeft className="size-4" />
                </Button>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.22em]">HR Workspace</p>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{currentSection.label}</h2>
                    <span className="hidden rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground md:inline-flex">
                      {todayLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-xl bg-background/90 max-xl:hidden"
                  onClick={() => setDesktopSidebarCollapsed((value) => !value)}
                >
                  {desktopSidebarCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
                </Button>
                <div className="flex items-center gap-2 rounded-xl border bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  <Search className="size-4" />
                  Search jobs, candidates, or sessions
                </div>
                <Button variant="outline" size="icon" className="size-10 rounded-xl bg-background/90">
                  <Bell className="size-4" />
                </Button>
                <Button className="h-10 rounded-xl px-4" onClick={() => navigate('/hr/interviews/new')}>
                  New interview
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-[1680px]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
