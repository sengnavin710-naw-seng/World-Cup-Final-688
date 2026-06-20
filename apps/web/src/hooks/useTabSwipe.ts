import {
  useCallback,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

const HORIZONTAL_INTENT_RATIO = 1.2;
const INTENT_SLOP = 8;
const DISTANCE_THRESHOLD_RATIO = 0.28;
const MIN_VELOCITY_DISTANCE = 72;
const VELOCITY_THRESHOLD = 1.1;
const EDGE_RESISTANCE = 0.18;
const SETTLE_DURATION_MS = 300;
const SETTLE_FALLBACK_MS = 380;
const SETTLE_TRANSITION = `transform ${SETTLE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
const TAB_SWIPE_IGNORE_SELECTOR = "[data-tab-swipe-ignore='true']";

export interface SwipeDecisionInput {
  activeIndex: number;
  distanceX: number;
  distanceY: number;
  elapsedMs: number;
  tabCount: number;
  viewportWidth: number;
}

export function resolveSwipeDelta({
  activeIndex,
  distanceX,
  distanceY,
  elapsedMs,
  tabCount,
  viewportWidth,
}: SwipeDecisionInput) {
  const horizontalDistance = Math.abs(distanceX);

  if (
    tabCount <= 0 ||
    horizontalDistance <= Math.abs(distanceY) * HORIZONTAL_INTENT_RATIO
  ) {
    return 0;
  }

  const velocity = horizontalDistance / Math.max(elapsedMs, 1);
  const crossedDistance =
    viewportWidth > 0 &&
    horizontalDistance >= viewportWidth * DISTANCE_THRESHOLD_RATIO;
  const crossedVelocity =
    horizontalDistance >= MIN_VELOCITY_DISTANCE && velocity >= VELOCITY_THRESHOLD;

  if (!crossedDistance && !crossedVelocity) {
    return 0;
  }

  const direction = distanceX < 0 ? 1 : -1;
  const nextIndex = Math.min(
    Math.max(activeIndex + direction, 0),
    tabCount - 1,
  );

  return nextIndex - activeIndex;
}

interface UseTabSwipeOptions {
  activeIndex: number;
  onIndexChange: (nextIndex: number) => void;
  reducedMotion: boolean;
  tabCount: number;
}

interface ActiveGesture {
  captured: boolean;
  intent: "horizontal" | "pending" | "vertical";
  pointerId: number;
  startTime: number;
  startX: number;
  startY: number;
}

export function useTabSwipe({
  activeIndex,
  onIndexChange,
  reducedMotion,
  tabCount,
}: UseTabSwipeOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeGestureRef = useRef<ActiveGesture | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingTargetIndexRef = useRef<number | null>(null);
  const pendingShouldCommitRef = useRef(false);
  const pendingTransitionEndListenerRef = useRef<((event: TransitionEvent) => void) | null>(null);
  const pendingTransitionEndTargetRef = useRef<HTMLDivElement | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const observedViewportWidthRef = useRef<number | null>(null);

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const setTransform = useCallback(
    (index: number, dragOffset = 0, animated = false) => {
      const viewport = viewportRef.current;
      const track = trackRef.current;

      if (!viewport || !track) {
        return;
      }

      track.style.transition =
        animated && !reducedMotion ? SETTLE_TRANSITION : "none";
      track.style.transform = `translate3d(${
        -index * viewport.clientWidth + dragOffset
      }px, 0, 0)`;
    },
    [reducedMotion],
  );

  const settle = useCallback(
    (animated = true) => {
      cancelFrame();
      setTransform(activeIndex, 0, animated);
    },
    [activeIndex, cancelFrame, setTransform],
  );

  const clearPendingSettle = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    if (
      pendingTransitionEndTargetRef.current &&
      pendingTransitionEndListenerRef.current
    ) {
      pendingTransitionEndTargetRef.current.removeEventListener(
        "transitionend",
        pendingTransitionEndListenerRef.current,
      );
    }

    pendingTargetIndexRef.current = null;
    pendingShouldCommitRef.current = false;
    pendingTransitionEndTargetRef.current = null;
    pendingTransitionEndListenerRef.current = null;
  }, []);

  const completePendingSettle = useCallback(() => {
    const targetIndex = pendingTargetIndexRef.current;
    const shouldCommit = pendingShouldCommitRef.current;

    if (targetIndex === null) {
      return;
    }

    clearPendingSettle();
    if (shouldCommit) {
      onIndexChange(targetIndex);
    }
  }, [clearPendingSettle, onIndexChange]);

  const startTargetSettle = useCallback(
    (targetIndex: number) => {
      const track = trackRef.current;

      clearPendingSettle();

      if (reducedMotion) {
        if (targetIndex !== activeIndex) {
          onIndexChange(targetIndex);
        }
        return;
      }

      if (targetIndex === activeIndex) {
        if (!track) {
          return;
        }

        const handleTransitionEnd = (event: TransitionEvent) => {
          if (event.target !== track || event.propertyName !== "transform") {
            return;
          }

          completePendingSettle();
        };

        pendingTargetIndexRef.current = targetIndex;
        pendingShouldCommitRef.current = false;
        pendingTransitionEndTargetRef.current = track;
        pendingTransitionEndListenerRef.current = handleTransitionEnd;

        setTransform(targetIndex, 0, true);
        track.addEventListener("transitionend", handleTransitionEnd);
        pendingTimeoutRef.current = window.setTimeout(() => {
          completePendingSettle();
        }, SETTLE_FALLBACK_MS);
        return;
      }

      if (!track) {
        onIndexChange(targetIndex);
        return;
      }

      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.target !== track || event.propertyName !== "transform") {
          return;
        }

        completePendingSettle();
      };

      pendingTargetIndexRef.current = targetIndex;
      pendingShouldCommitRef.current = true;
      pendingTransitionEndTargetRef.current = track;
      pendingTransitionEndListenerRef.current = handleTransitionEnd;

      setTransform(targetIndex, 0, true);
      track.addEventListener("transitionend", handleTransitionEnd);
      pendingTimeoutRef.current = window.setTimeout(() => {
        completePendingSettle();
      }, SETTLE_FALLBACK_MS);
    },
    [
      activeIndex,
      clearPendingSettle,
      completePendingSettle,
      onIndexChange,
      reducedMotion,
      setTransform,
    ],
  );

  useLayoutEffect(() => {
    settle();
    return () => {
      clearPendingSettle();
    };
  }, [activeIndex, clearPendingSettle, reducedMotion, settle]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }

    observedViewportWidthRef.current = viewport.clientWidth;

    const observer = new ResizeObserver(() => {
      const nextWidth = viewport.clientWidth;

      if (nextWidth === observedViewportWidthRef.current) {
        return;
      }

      observedViewportWidthRef.current = nextWidth;
      settle(false);
    });
    observer.observe(viewport);

    return () => {
      observedViewportWidthRef.current = null;
      observer.disconnect();
    };
  }, [settle]);

  useLayoutEffect(
    () => () => {
      cancelFrame();
    },
    [cancelFrame],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pendingTargetIndexRef.current !== null) {
        return;
      }

      const target = event.target;
      const ignoredTarget =
        target instanceof Element
          ? target.closest(TAB_SWIPE_IGNORE_SELECTOR)
          : null;

      if (ignoredTarget && event.currentTarget.contains(ignoredTarget)) {
        return;
      }

      if (activeGestureRef.current?.captured) {
        return;
      }

      let captured = false;
      if (typeof event.currentTarget.setPointerCapture === "function") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
          captured = true;
        } catch {
          captured = false;
        }
      }

      activeGestureRef.current = {
        captured,
        intent: "pending",
        pointerId: event.pointerId,
        startTime: event.timeStamp,
        startX: event.clientX,
        startY: event.clientY,
      };

      if (trackRef.current) {
        trackRef.current.style.transition = "none";
      }
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const distanceX = event.clientX - gesture.startX;
      const distanceY = event.clientY - gesture.startY;

      if (gesture.intent === "pending") {
        if (Math.hypot(distanceX, distanceY) <= INTENT_SLOP) {
          return;
        }

        gesture.intent =
          Math.abs(distanceX) > Math.abs(distanceY) * HORIZONTAL_INTENT_RATIO
            ? "horizontal"
            : "vertical";
      }

      if (gesture.intent === "vertical") {
        return;
      }

      event.preventDefault();

      const isPastFirstTab = activeIndex === 0 && distanceX > 0;
      const isPastLastTab =
        activeIndex === tabCount - 1 && distanceX < 0;
      const dragOffset =
        isPastFirstTab || isPastLastTab
          ? distanceX * EDGE_RESISTANCE
          : distanceX;

      cancelFrame();
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setTransform(activeIndex, dragOffset);
      });
    },
    [activeIndex, cancelFrame, setTransform, tabCount],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const delta =
        gesture.intent === "vertical"
          ? 0
          : resolveSwipeDelta({
              activeIndex,
              distanceX: event.clientX - gesture.startX,
              distanceY: event.clientY - gesture.startY,
              elapsedMs: event.timeStamp - gesture.startTime,
              tabCount,
              viewportWidth: viewportRef.current?.clientWidth ?? 0,
            });

      activeGestureRef.current = null;
      cancelFrame();

      if (
        gesture.captured &&
        typeof event.currentTarget.hasPointerCapture === "function" &&
        typeof event.currentTarget.releasePointerCapture === "function"
      ) {
        try {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Pointer capture may already have been released by the browser.
        }
      }

      if (delta === 0) {
        startTargetSettle(activeIndex);
        return;
      }

      startTargetSettle(activeIndex + delta);
    },
    [activeIndex, cancelFrame, startTargetSettle, tabCount],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      activeGestureRef.current = null;
      settle();
    },
    [settle],
  );

  return {
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    trackRef,
    viewportRef,
  };
}
