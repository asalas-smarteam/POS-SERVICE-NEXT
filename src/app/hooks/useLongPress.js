"use client";

import { useCallback, useRef } from "react";

export function useLongPress({ onLongPress, onClick, delay = 500 }) {
  const timeoutRef = useRef(null);
  const hasLongPressedRef = useRef(false);

  const startPress = useCallback(
    (event) => {
      hasLongPressedRef.current = false;
      timeoutRef.current = setTimeout(() => {
        hasLongPressedRef.current = true;
        onLongPress?.(event);
      }, delay);
    },
    [delay, onLongPress]
  );

  const clearPress = useCallback(
    (shouldRunClick = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (shouldRunClick && !hasLongPressedRef.current) {
        onClick?.();
      }
    },
    [onClick]
  );

  return {
    onMouseDown: startPress,
    onMouseUp: () => clearPress(true),
    onMouseLeave: () => clearPress(false),
    onTouchStart: startPress,
    onTouchEnd: () => clearPress(true),
  };
}
