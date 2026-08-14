import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * HeaderPortal renders children into #main-header-actions seamlessly and unmounts cleanly with the route component.
 */
export function HeaderPortal({ children }) {
  const [container, setContainer] = useState(() => {
    return typeof document !== 'undefined' ? document.getElementById('main-header-actions') : null;
  });

  useEffect(() => {
    if (!container && typeof document !== 'undefined') {
      setContainer(document.getElementById('main-header-actions'));
    }
  }, [container]);

  if (!container) return null;
  return createPortal(children, container);
}
