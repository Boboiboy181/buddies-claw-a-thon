import { Briefcase, CalendarDays, LayoutDashboard, LogOut, Users, type LucideIcon } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export const SHELL_HEADER_HEIGHT = 'min-h-[104px]';

const navItems = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard', hint: 'Overview and live pipeline' },
  { to: '/hr/jobs', icon: Briefcase, label: 'Jobs', hint: 'Role briefs and scorecards' },
  { to: '/hr/interviews', icon: CalendarDays, label: 'Interviews', hint: 'Sessions, reports, recordings' },
  { to: '/hr/candidates', icon: Users, label: 'Candidates', hint: 'Profiles and activity history' },
] satisfies Array<{ to: string; icon: LucideIcon; label: string; hint: string }>;

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const collapsed = state === 'collapsed';

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    logout();
    closeOnMobile();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn('border-sidebar-border border-b px-4 py-4', SHELL_HEADER_HEIGHT, 'flex items-center')}>
        <Link to="/hr/dashboard" onClick={closeOnMobile} className={cn('flex w-full items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Briefcase className="size-4.5" />
          </div>
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <h1 className="font-heading truncate text-base font-semibold tracking-tight text-foreground">HR Interview</h1>
            <p className="text-sidebar-foreground/65 text-xs">Hiring workspace</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed && 'space-y-2')}>
              {navItems.map(({ to, icon: Icon, label, hint }) => {
                const isActive = location.pathname.startsWith(to);

                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={to} onClick={closeOnMobile} title={collapsed ? label : undefined}>
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                            collapsed && 'size-10',
                            isActive
                              ? 'border-primary/20 bg-primary text-primary-foreground'
                              : 'border-sidebar-border bg-background/80 text-sidebar-foreground/75 group-hover/menu-button:border-transparent group-hover/menu-button:bg-sidebar-accent'
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className={cn('min-w-0', collapsed && 'hidden')}>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{hint}</p>
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-4">
        <div
          className={cn(
            'mb-3 flex items-center gap-3 rounded-lg border border-sidebar-border/80 bg-background/90 px-3 py-3',
            collapsed && 'justify-center border-transparent bg-transparent px-0 py-0'
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
            {user?.name?.[0]?.toUpperCase() ?? 'H'}
          </div>
          <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="outline"
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'h-10 w-full justify-start gap-2 rounded-lg bg-background/90',
            collapsed && 'mx-auto size-10 justify-center border-sidebar-border/80 px-0'
          )}
        >
          <LogOut className="size-4" />
          <span className={cn(collapsed && 'hidden')}>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
