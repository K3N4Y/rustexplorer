import * as React from 'react';
import { cn } from '@/lib/utils';

function SidebarProvider({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-provider"
      className={cn('flex min-h-screen w-full bg-background text-foreground', className)}
      {...props}
    >
      {children}
    </div>
  );
}

const Sidebar = React.forwardRef<HTMLElement, React.ComponentProps<'aside'>>(
  ({ className, children, ...props }, ref) => (
    <aside
      ref={ref}
      data-slot="sidebar"
      className={cn(
        'flex h-screen w-80 shrink-0 flex-col border-r border-border bg-card',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  ),
);
Sidebar.displayName = 'Sidebar';

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('border-b border-border px-4 py-3', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex-1 overflow-y-auto px-2 py-2', className)}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn('min-w-0 flex-1 bg-background', className)}
      {...props}
    />
  );
}

export { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset };
