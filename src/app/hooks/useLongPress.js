"use client";

import { useCallback, useRef } from "react";

const MOVE_CANCEL_THRESHOLD = 10;

export function useLongPress({ onLongPress, onClick, delay = 500 }) {
  const timeoutRef = useRef(null);
  const hasLongPressedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPress = useCallback(
    (event) => {
      hasLongPressedRef.current = false;
      isDraggingRef.current = false;
      startPosRef.current = event.touches?.[0]
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;

      timeoutRef.current = setTimeout(() => {
        hasLongPressedRef.current = true;
        onLongPress?.(event);
      }, delay);
    },
    [delay, onLongPress]
  );

  const handleTouchMove = useCallback(
    (event) => {
      if (!startPosRef.current || isDraggingRef.current) return;
      const touch = event.touches?.[0];
      if (!touch) return;

      const dx = Math.abs(touch.clientX - startPosRef.current.x);
      const dy = Math.abs(touch.clientY - startPosRef.current.y);
      if (dx > MOVE_CANCEL_THRESHOLD || dy > MOVE_CANCEL_THRESHOLD) {
        isDraggingRef.current = true;
        clearTimer();
      }
    },
    [clearTimer]
  );

  const clearPress = useCallback(
    (shouldRunClick = true) => {
      clearTimer();

      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      startPosRef.current = null;

      if (shouldRunClick && !hasLongPressedRef.current && !wasDragging) {
        onClick?.();
      }
    },
    [clearTimer, onClick]
  );

  return {
    onMouseDown: startPress,
    onMouseUp: () => clearPress(true),
    onMouseLeave: () => clearPress(false),
    onTouchStart: startPress,
    onTouchMove: handleTouchMove,
    onTouchEnd: () => clearPress(true),
  };
}
