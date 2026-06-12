import * as React from 'react';

import { PanelLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = '14.5rem';
const SIDEBAR_WIDTH_ICON = '4rem';
const SIDEBAR_WIDTH_MOBILE = '16rem';

type SidebarState = 'expanded' | 'collapsed';

type SidebarContextValue = {
  isMobile: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  state: SidebarState;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  style,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useMediaQuery('(max-width: 1279px)');
  const [openMobile, setOpenMobile] = React.useState(false);
  const [openState, setOpenState] = React.useState(defaultOpen);

  const open = openProp ?? openState;
  const setOpen = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (value) => {
      const nextOpen = typeof value === 'function' ? value(open) : value;

      if (onOpenChange) {
        onOpenChange(nextOpen);
        return;
      }

      setOpenState(nextOpen);
    },
    [onOpenChange, open]
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current);
      return;
    }

    setOpen((current) => !current);
  }, [isMobile, setOpen]);

  const state: SidebarState = open ? 'expanded' : 'collapsed';

  return (
    <SidebarContext.Provider
      value={{
        isMobile,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        state,
        toggleSidebar,
      }}
    >
      <div
        data-slot="sidebar-wrapper"
        data-state={state}
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={cn('group/sidebar-wrapper flex min-h-screen w-full', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  const panel = (
    <div
      data-slot="sidebar-panel"
      data-variant={variant}
      data-state={state}
      className={cn(
        'flex h-full min-h-0 flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur',
        variant === 'sidebar' && 'border-sidebar-border border-r',
        variant === 'floating' && 'm-2 rounded-2xl border border-sidebar-border',
        variant === 'inset' && 'm-2 rounded-2xl border border-sidebar-border'
      )}
    >
      {children}
    </div>
  );

  if (isMobile && collapsible !== 'none') {
    return (
      <>
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setOpenMobile(false)}
          className={cn(
            'fixed inset-0 z-40 bg-black/45 transition-opacity xl:hidden',
            openMobile ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        />
        <aside
          data-slot="sidebar"
          data-mobile="true"
          data-state={openMobile ? 'expanded' : 'collapsed'}
          className={cn(
            'fixed inset-y-0 z-50 w-[var(--sidebar-width-mobile)] transition-transform duration-200 xl:hidden',
            side === 'left'
              ? openMobile
                ? 'left-0 translate-x-0'
                : 'left-0 -translate-x-full'
              : openMobile
                ? 'right-0 translate-x-0'
                : 'right-0 translate-x-full',
            className
          )}
          {...props}
        >
          {panel}
        </aside>
      </>
    );
  }

  const desktopWidth =
    collapsible === 'icon' && state === 'collapsed' ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)';

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsible}
      className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 xl:block', className)}
      style={{ width: desktopWidth }}
      {...props}
    >
      {panel}
    </aside>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('shrink-0', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('shrink-0', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('px-3 py-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return null;
  }

  return (
    <div
      data-slot="sidebar-group-label"
      className={cn('px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/45', className)}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('mt-2', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('space-y-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn(className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const classes = cn(
    'group/menu-button flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-all',
    collapsed && 'mx-auto size-11 justify-center px-0',
    isActive
      ? 'border-primary/20 bg-primary/10 text-foreground'
      : 'text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
    className
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;

    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
      'data-slot': 'sidebar-menu-button',
    });
  }

  return (
    <button data-slot="sidebar-menu-button" className={classes} {...props}>
      {children}
    </button>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-inset" className={cn('flex min-w-0 flex-1 flex-col', className)} {...props} />;
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="outline"
      size="icon"
      className={cn('size-10 rounded-lg', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {props.children ?? <PanelLeft className="size-4" />}
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
