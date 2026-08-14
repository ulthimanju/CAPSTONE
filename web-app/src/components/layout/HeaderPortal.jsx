import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * HeaderPortal renders children into main header slots (actions, left, center)
 */
export function HeaderPortal({ children, target = 'actions' }) {
  const containerId =
    target === 'left'
      ? 'main-header-left'
      : target === 'center'
      ? 'main-header-center'
      : 'main-header-actions';

  const [container, setContainer] = useState(() => {
    return typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setContainer(document.getElementById(containerId));
    }
  }, [containerId]);

  if (!container) return null;
  return createPortal(children, container);
}
