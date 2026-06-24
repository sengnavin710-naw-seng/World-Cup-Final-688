import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
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
  onMotionStateChange?: (state: TabSwipeMotionState) => void;
  onIndexChange: (nextIndex: number) => void;
  reducedMotion: boolean;
  tabCount: number;
}

export type TabSwipePhase = "idle" | "dragging" | "settling";

export type TabSwipeMotionState = {
  pendingIndex: number | null;
  phase: TabSwipePhase;
  visualIndex: number;
};

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
  onMotionStateChange,
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
  const onMotionStateChangeRef = useRef(onMotionStateChange);
  const visualIndexRef = useRef(activeIndex);
  const pendingIndexRef = useRef<number | null>(null);
  const phaseRef = useRef<TabSwipePhase>("idle");
  const [visualIndex, setVisualIndex] = useState(activeIndex);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<TabSwipePhase>("idle");

  useLayoutEffect(() => {
    onMotionStateChangeRef.current = onMotionStateChange;
  }, [onMotionStateChange]);

  const notifyMotionState = useCallback(() => {
    onMotionStateChangeRef.current?.({
      pendingIndex: pendingIndexRef.current,
      phase: phaseRef.current,
      visualIndex: visualIndexRef.current,
    });
  }, []);

  const updatePendingIndex = useCallback(
    (nextPendingIndex: number | null, notify = false) => {
      if (pendingIndexRef.current !== nextPendingIndex) {
        pendingIndexRef.current = nextPendingIndex;
        setPendingIndex(nextPendingIndex);
      }

      if (notify) {
        notifyMotionState();
      }
    },
    [notifyMotionState],
  );

  const updatePhase = useCallback(
    (nextPhase: TabSwipePhase, notify = false) => {
      if (phaseRef.current !== nextPhase) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      }

      if (notify) {
        notifyMotionState();
      }
    },
    [notifyMotionState],
  );

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const publishVisualIndex = useCallback(
    (nextVisualIndex: number, syncRenderState = false) => {
      visualIndexRef.current = nextVisualIndex;

      if (syncRenderState) {
        setVisualIndex(nextVisualIndex);
      }

      notifyMotionState();
    },
    [notifyMotionState],
  );

  const setTransform = useCallback(
    (index: number, dragOffset = 0, animated = false) => {
      const viewport = viewportRef.current;
      const track = trackRef.current;

      if (!viewport || !track) {
        return;
      }

      const width = viewport.clientWidth || 1;
      const nextVisualIndex = index - dragOffset / width;

      track.style.transition =
        animated && !reducedMotion ? SETTLE_TRANSITION : "none";
      track.style.transform = `translate3d(${
        -nextVisualIndex * width
      }px, 0, 0)`;
      publishVisualIndex(nextVisualIndex, dragOffset === 0);
    },
    [publishVisualIndex, reducedMotion],
  );

  const scheduleSettledTransform = useCallback(
    (targetIndex: number) => {
      cancelFrame();
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setTransform(targetIndex, 0, true);
      });
    },
    [cancelFrame, setTransform],
  );

  const settle = useCallback(
    (animated = true) => {
      cancelFrame();
      setTransform(activeIndex, 0, animated);
    },
    [activeIndex, cancelFrame, setTransform],
  );

  const clearPendingSettle = useCallback(() => {
    const shouldNotify =
      pendingTargetIndexRef.current !== null ||
      pendingIndexRef.current !== null ||
      phaseRef.current !== "idle";

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
    updatePendingIndex(null);
    updatePhase("idle");
    pendingTransitionEndTargetRef.current = null;
    pendingTransitionEndListenerRef.current = null;

    if (shouldNotify) {
      notifyMotionState();
    }
  }, [notifyMotionState, updatePendingIndex, updatePhase]);

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
        setTransform(targetIndex, 0, false);
        updatePendingIndex(null);
        updatePhase("idle");
        if (targetIndex !== activeIndex) {
          onIndexChange(targetIndex);
        }
        return;
      }

      if (targetIndex === activeIndex) {
        if (!track) {
          publishVisualIndex(targetIndex, true);
          updatePendingIndex(null);
          updatePhase("idle");
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
        updatePendingIndex(targetIndex);
        updatePhase("settling");
        pendingTransitionEndTargetRef.current = track;
        pendingTransitionEndListenerRef.current = handleTransitionEnd;

        track.addEventListener("transitionend", handleTransitionEnd);
        scheduleSettledTransform(targetIndex);
        pendingTimeoutRef.current = window.setTimeout(() => {
          completePendingSettle();
        }, SETTLE_FALLBACK_MS);
        return;
      }

      if (!track) {
        publishVisualIndex(targetIndex, true);
        updatePendingIndex(null);
        updatePhase("idle");
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
      updatePendingIndex(targetIndex);
      updatePhase("settling");
      pendingTransitionEndTargetRef.current = track;
      pendingTransitionEndListenerRef.current = handleTransitionEnd;

      track.addEventListener("transitionend", handleTransitionEnd);
      scheduleSettledTransform(targetIndex);
      pendingTimeoutRef.current = window.setTimeout(() => {
        completePendingSettle();
      }, SETTLE_FALLBACK_MS);
    },
    [
      activeIndex,
      clearPendingSettle,
      completePendingSettle,
      onIndexChange,
      publishVisualIndex,
      reducedMotion,
      scheduleSettledTransform,
      setTransform,
      updatePendingIndex,
      updatePhase,
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

      // Don't setPointerCapture immediately — wait until intent is confirmed
      // as horizontal in onPointerMove. Capturing too early prevents child
      // buttons from receiving click events on the first tap (touchpad bug).
      activeGestureRef.current = {
        captured: false,
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

        // Only capture the pointer once we know it's a horizontal swipe.
        // This lets buttons receive the click on the first tap.
        if (gesture.intent === "horizontal" && !gesture.captured) {
          const el = event.currentTarget;
          if (typeof el.setPointerCapture === "function") {
            try {
              el.setPointerCapture(event.pointerId);
              gesture.captured = true;
            } catch {
              // ignore
            }
          }
        }
      }

      if (gesture.intent === "vertical") {
        return;
      }

      event.preventDefault();
      updatePhase("dragging");

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
    [activeIndex, cancelFrame, setTransform, tabCount, updatePhase],
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
      cancelFrame();
      startTargetSettle(activeIndex);
    },
    [activeIndex, cancelFrame, startTargetSettle],
  );

  return {
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    pendingIndex,
    phase,
    settleToIndex: startTargetSettle,
    trackRef,
    visualIndex,
    viewportRef,
  };
}
