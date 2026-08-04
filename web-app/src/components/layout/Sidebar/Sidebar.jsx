import {
  createContext,
  useContext,
  useMemo,
} from "react";

import { cn } from "@/lib/cn";

import { sidebarVariants } from "./Sidebar.variants";

const SidebarContext = createContext(null);

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error(
      "Sidebar components must be used inside <Sidebar />."
    );
  }

  return context;
}

export function Sidebar({
  children,

  collapsed = false,

  className,

  ...props
}) {
  const value = useMemo(
    () => ({
      collapsed,
    }),
    [collapsed]
  );

  return (
    <SidebarContext.Provider value={value}>
      <aside
        className={cn(
          sidebarVariants({
            collapsed,
          }),
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}