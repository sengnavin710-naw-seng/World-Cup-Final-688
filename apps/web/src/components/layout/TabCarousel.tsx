import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useTabSwipe, type TabSwipePhase } from "../../hooks/useTabSwipe";
import type { HomeTab } from "../../lib/tournamentQueries";

export type TabNavigationRequest = {
  id: number;
  index: number;
};

export type TabCarouselMotionState = {
  pendingIndex: number | null;
  phase: TabSwipePhase;
  visualIndex: number;
};

type TabCarouselProps = {
  activeIndex: number;
  navigationRequest?: TabNavigationRequest | null;
  onActiveIndexChange: (index: number) => void;
  onMotionStateChange?: (state: TabCarouselMotionState) => void;
  reducedMotion: boolean;
  renderTab: (tab: HomeTab) => ReactNode;
  tabs: readonly HomeTab[];
};

export function TabCarousel({
  activeIndex,
  navigationRequest = null,
  onActiveIndexChange,
  onMotionStateChange,
  reducedMotion,
  renderTab,
  tabs,
}: TabCarouselProps) {
  const activeSlideRef = useRef<HTMLDivElement>(null);
  const handledNavigationRequestIdRef = useRef<number | null>(null);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: onActiveIndexChange,
    reducedMotion,
    tabCount: tabs.length,
  });
  const { settleToIndex } = swipe;

  useEffect(() => {
    onMotionStateChange?.({
      pendingIndex: swipe.pendingIndex,
      phase: swipe.phase,
      visualIndex: swipe.visualIndex,
    });
  }, [onMotionStateChange, swipe.pendingIndex, swipe.phase, swipe.visualIndex]);

  useEffect(() => {
    if (!navigationRequest) {
      return;
    }

    if (handledNavigationRequestIdRef.current === navigationRequest.id) {
      return;
    }

    handledNavigationRequestIdRef.current = navigationRequest.id;
    settleToIndex(navigationRequest.index);
  }, [navigationRequest, settleToIndex]);

  const mountedIndexes = useMemo(() => {
    const indexes = new Set<number>();
    const addWithNeighbors = (index: number | null) => {
      if (index === null) {
        return;
      }

      indexes.add(index);
      indexes.add(index - 1);
      indexes.add(index + 1);
    };

    addWithNeighbors(activeIndex);
    addWithNeighbors(swipe.pendingIndex);

    return indexes;
  }, [activeIndex, swipe.pendingIndex]);

  useLayoutEffect(() => {
    const activeSlide = activeSlideRef.current;
    const viewport = swipe.viewportRef.current;

    if (!activeSlide || !viewport) {
      return;
    }

    const updateHeight = () => {
      viewport.style.height = `${activeSlide.scrollHeight}px`;
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(activeSlide);

    return () => {
      observer.disconnect();
    };
  }, [activeIndex, swipe.viewportRef]);

  return (
    <div
      aria-label="Tournament tabs"
      className="tab-carousel-viewport"
      onPointerCancel={swipe.onPointerCancel}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      ref={swipe.viewportRef}
    >
      <div
        className="tab-carousel-track"
        data-testid="tab-carousel-track"
        ref={swipe.trackRef}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const shouldMount = mountedIndexes.has(index);

          return (
            <div
              aria-hidden={isActive ? undefined : true}
              className="tab-carousel-slide"
              data-testid={`tab-slide-${tab}`}
              inert={isActive ? undefined : true}
              key={tab}
              ref={isActive ? activeSlideRef : undefined}
            >
              {shouldMount ? renderTab(tab) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
