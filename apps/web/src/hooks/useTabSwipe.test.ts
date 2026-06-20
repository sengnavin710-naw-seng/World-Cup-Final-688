import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, useState, type MutableRefObject } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { resolveSwipeDelta, useTabSwipe } from "./useTabSwipe";

function SwipeHarness({
  onIndexChange,
}: {
  onIndexChange: (nextIndex: number) => void;
}) {
  const swipe = useTabSwipe({
    activeIndex: 1,
    onIndexChange,
    reducedMotion: true,
    tabCount: 4,
  });

  return createElement(
    "div",
    {
      "data-testid": "swipe-viewport",
      onPointerCancel: swipe.onPointerCancel,
      onPointerDown: swipe.onPointerDown,
      onPointerMove: swipe.onPointerMove,
      onPointerUp: swipe.onPointerUp,
      ref: swipe.viewportRef,
    },
    createElement("div", { ref: swipe.trackRef }),
  );
}

function NormalMotionSwipeHarness() {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: setActiveIndex,
    reducedMotion: false,
    tabCount: 4,
  });

  const setViewportRef = (node: HTMLDivElement | null) => {
    if (node) {
      setViewportWidth(node, 390);
    }

    (
      swipe.viewportRef as MutableRefObject<HTMLDivElement | null>
    ).current = node;
  };

  return createElement(
    "div",
    {
      "data-testid": "swipe-viewport",
      ref: setViewportRef,
    },
    createElement("div", {
      "data-testid": "swipe-track",
      ref: swipe.trackRef,
    }),
    createElement(
      "button",
      {
        onClick: () => {
          setActiveIndex(1);
        },
      },
      "Next",
    ),
  );
}

function setViewportWidth(viewport: HTMLElement, width: number) {
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: width,
  });
}

function firePointerEvent(
  viewport: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup",
  { clientX, clientY, pointerId }: PointerEventInit,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    pointerId: { value: pointerId },
  });
  fireEvent(viewport, event);
}

class ControlledResizeObserver implements ResizeObserver {
  readonly observedTargets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    controlledResizeObservers.push(this);
  }

  disconnect = vi.fn(() => {
    this.observedTargets.clear();
  });

  observe = vi.fn((target: Element) => {
    this.observedTargets.add(target);
  });

  unobserve = vi.fn((target: Element) => {
    this.observedTargets.delete(target);
  });

  trigger({
    height,
    target,
    width,
  }: {
    height: number;
    target: Element;
    width: number;
  }) {
    if (!this.observedTargets.has(target)) {
      return;
    }

    this.callback(
      [
        {
          contentRect: { height, width } as DOMRectReadOnly,
          target,
        } as ResizeObserverEntry,
      ],
      this,
    );
  }
}

let controlledResizeObservers: ControlledResizeObserver[] = [];

function installControlledResizeObserver() {
  controlledResizeObservers = [];
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveSwipeDelta", () => {
  test("moves one tab after a long fast left swipe", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 0,
        distanceX: -420,
        distanceY: 18,
        elapsedMs: 120,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(1);
  });

  test("stays on the current tab after a short slow swipe", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -30,
        distanceY: 8,
        elapsedMs: 220,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });

  test("does not treat zero viewport width as a crossed distance", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -30,
        distanceY: 8,
        elapsedMs: 220,
        tabCount: 4,
        viewportWidth: 0,
      }),
    ).toBe(0);
  });

  test("ignores vertical scrolling", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -80,
        distanceY: 220,
        elapsedMs: 250,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });

  test("clamps swipes at both ends", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 0,
        distanceX: 180,
        distanceY: 5,
        elapsedMs: 180,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
    expect(
      resolveSwipeDelta({
        activeIndex: 3,
        distanceX: -180,
        distanceY: 5,
        elapsedMs: 180,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });
});

describe("useTabSwipe", () => {
  test("does not navigate after locking vertical intent without pointer capture APIs", () => {
    const onIndexChange = vi.fn();
    render(createElement(SwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    setViewportWidth(viewport, 390);
    Object.defineProperties(viewport, {
      hasPointerCapture: { configurable: true, value: undefined },
      releasePointerCapture: { configurable: true, value: undefined },
      setPointerCapture: { configurable: true, value: undefined },
    });

    expect(() => {
      firePointerEvent(viewport, "pointerdown", {
        clientX: 200,
        clientY: 200,
        pointerId: 1,
      });
      firePointerEvent(viewport, "pointermove", {
        clientX: 195,
        clientY: 240,
        pointerId: 1,
      });
      firePointerEvent(viewport, "pointerup", {
        clientX: 40,
        clientY: 202,
        pointerId: 1,
      });
    }).not.toThrow();
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  test("allows a horizontal swipe after sub-slop vertical jitter", () => {
    const onIndexChange = vi.fn();
    render(createElement(SwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    setViewportWidth(viewport, 390);
    Object.assign(viewport, {
      hasPointerCapture: () => false,
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });

    firePointerEvent(viewport, "pointerdown", {
      clientX: 200,
      clientY: 200,
      pointerId: 2,
    });
    firePointerEvent(viewport, "pointermove", {
      clientX: 200,
      clientY: 203,
      pointerId: 2,
    });
    firePointerEvent(viewport, "pointermove", {
      clientX: 120,
      clientY: 204,
      pointerId: 2,
    });
    firePointerEvent(viewport, "pointerup", {
      clientX: 120,
      clientY: 204,
      pointerId: 2,
    });

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("allows a new gesture after pointer capture fails", () => {
    const onIndexChange = vi.fn();
    render(createElement(SwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    setViewportWidth(viewport, 390);
    Object.assign(viewport, {
      hasPointerCapture: () => false,
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(() => {
        throw new Error("capture unavailable");
      }),
    });

    firePointerEvent(viewport, "pointerdown", {
      clientX: 200,
      clientY: 200,
      pointerId: 3,
    });
    Object.assign(viewport, { setPointerCapture: vi.fn() });
    firePointerEvent(viewport, "pointerdown", {
      clientX: 200,
      clientY: 200,
      pointerId: 4,
    });
    firePointerEvent(viewport, "pointerup", {
      clientX: 120,
      clientY: 204,
      pointerId: 4,
    });

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("keeps the settle transition after a height-only viewport resize", () => {
    installControlledResizeObserver();
    render(createElement(NormalMotionSwipeHarness));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const viewportObserver = [...controlledResizeObservers]
      .reverse()
      .find((observer) => observer.observedTargets.has(viewport));

    expect(viewportObserver).toBeDefined();
    expect(track.style.transition).toContain("transform 180ms");

    viewportObserver?.trigger({
      height: 720,
      target: viewport,
      width: 390,
    });

    expect(track.style.transition).toContain("transform 180ms");
  });
});
