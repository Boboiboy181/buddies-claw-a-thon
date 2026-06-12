import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';
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

export const SHELL_HEADER_HEIGHT = 'min-h-16';

const navItems = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr/jobs', icon: BriefcaseBusiness, label: 'Jobs' },
  { to: '/hr/interviews', icon: CalendarDays, label: 'Interviews' },
  { to: '/hr/candidates', icon: Users, label: 'Candidates' },
] satisfies Array<{ to: string; icon: LucideIcon; label: string }>;

function SidebarItem({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
}) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isActive = location.pathname.startsWith(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          'h-9 rounded-md px-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/70',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
        )}
      >
        <NavLink to={to} onClick={onNavigate} title={collapsed ? label : undefined}>
          <Icon />
          <span className={cn('truncate', collapsed && 'hidden')}>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
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
    <Sidebar collapsible="icon" className="border-sidebar-border/80">
      <SidebarHeader className={cn('px-4 py-3', SHELL_HEADER_HEIGHT, 'flex items-center')}>
        <Link
          to="/hr/dashboard"
          onClick={closeOnMobile}
          className={cn('flex w-full items-center gap-2.5 rounded-lg text-left', collapsed && 'justify-center')}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <BriefcaseBusiness />
          </div>
          <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">Clawathon HR</h1>
            <p className="truncate text-xs leading-tight text-sidebar-foreground/65">Workspace</p>
          </div>
          <ChevronsUpDown className={cn('text-sidebar-foreground/80', collapsed && 'hidden')} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup className="px-2 py-2">
          <SidebarGroupLabel className={cn('px-0 text-xs font-semibold normal-case tracking-normal text-sidebar-foreground/60', collapsed && 'sr-only')}>
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn('flex flex-col gap-1', collapsed && 'items-center gap-2')}>
              {navItems.map((item) => (
                <SidebarItem key={item.to} {...item} onNavigate={closeOnMobile} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 p-4">
        <div className={cn('flex w-full items-center gap-2.5 rounded-lg text-left', collapsed && 'justify-center')}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {user?.name?.[0]?.toUpperCase() ?? 'H'}
          </div>
          <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{user?.name ?? 'HR User'}</p>
            <p className="truncate text-xs leading-tight text-sidebar-foreground/65">{user?.email ?? 'hr@example.com'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/75 transition hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
            collapsed && 'mx-auto size-8 justify-center px-0'
          )}
        >
          <LogOut />
          <span className={cn(collapsed && 'hidden')}>Logout</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
