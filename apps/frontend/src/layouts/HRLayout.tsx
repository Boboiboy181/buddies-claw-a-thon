import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LayoutDashboard, Briefcase, CalendarDays, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/hr/interviews', icon: CalendarDays, label: 'Interviews' },
  { to: '/hr/candidates', icon: Users, label: 'Candidates' },
];

export default function HRLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,1)_100%)]">
      <aside className="flex w-72 flex-col border-r bg-sidebar/95 backdrop-blur">
        <div className="border-b px-6 py-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="size-5" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">HR Interview</h1>
              <p className="text-muted-foreground text-sm">Operations cockpit</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-6">
            Coordinate roles, candidate pipelines, and AI interviews from one place.
          </p>
        </div>
        <nav className="flex-1 space-y-1.5 px-4 py-5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t px-4 py-5">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-background/80 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="h-10 w-full justify-start gap-2 rounded-xl">
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
