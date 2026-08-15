import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';

export function Sidebar({ header, footer, children, className }) {
  const isMobileSidebarOpen = useUIStore((state) => state.isMobileSidebarOpen);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        closeMobileSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Sidebar Header / Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4 sm:px-6">
        {header || (
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            SYNAPSE
          </span>
        )}
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation / Main Scrollable Content */}
      <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto p-4 space-y-1">
        {children}
      </nav>

      {/* Sidebar Footer */}
      {footer && (
        <div className="shrink-0 border-t border-sidebar-border p-4">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (280px) */}
      <aside
        className={cn(
          'hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-r lg:border-sidebar-border',
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Tablet & Mobile Off-Canvas Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-visibility duration-300',
          isMobileSidebarOpen ? 'visible' : 'invisible pointer-events-none'
        )}
        aria-hidden={!isMobileSidebarOpen}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={closeMobileSidebar}
          className={cn(
            'fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out',
            isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Drawer"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 ease-in-out',
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
