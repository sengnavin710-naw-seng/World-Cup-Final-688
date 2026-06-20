import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useTabSwipe } from "../../hooks/useTabSwipe";
import type { HomeTab } from "../../lib/tournamentQueries";

type TabCarouselProps = {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  reducedMotion: boolean;
  renderTab: (tab: HomeTab) => ReactNode;
  tabs: readonly HomeTab[];
};

export function TabCarousel({
  activeIndex,
  onActiveIndexChange,
  reducedMotion,
  renderTab,
  tabs,
}: TabCarouselProps) {
  const activeSlideRef = useRef<HTMLDivElement>(null);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: onActiveIndexChange,
    reducedMotion,
    tabCount: tabs.length,
  });

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
          const shouldMount = Math.abs(index - activeIndex) <= 1;

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
