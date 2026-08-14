import React, { createContext, useContext, useState, useCallback } from 'react';

const HeaderSlotContext = createContext(null);

export function HeaderSlotProvider({ children }) {
  const [headerSlot, setHeaderSlot] = useState(null);

  return (
    <HeaderSlotContext.Provider value={{ headerSlot, setHeaderSlot }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}

/**
 * SectionHeader — call this inside a section to register its header actions.
 * Renders nothing itself; just pushes content up into the AppLayout header bar.
 */
export function SectionHeader({ children }) {
  const ctx = useContext(HeaderSlotContext);

  React.useEffect(() => {
    if (!ctx) return;
    ctx.setHeaderSlot(children);
    return () => ctx.setHeaderSlot(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
