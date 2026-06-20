import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement, useState, type MutableRefObject } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { resolveSwipeDelta, useTabSwipe } from "./useTabSwipe";

function SwipeHarness({
  reducedMotion = true,
  onIndexChange,
}: {
  onIndexChange: (nextIndex: number) => void;
  reducedMotion?: boolean;
}) {
  const swipe = useTabSwipe({
    activeIndex: 1,
    onIndexChange,
    reducedMotion,
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
    createElement("div", {
      "data-testid": "swipe-track",
      ref: swipe.trackRef,
    }),
    createElement(
      "div",
      {
        "data-tab-swipe-ignore": "true",
        "data-testid": "nested-scroll-area",
      },
      "Nested scroll area",
    ),
  );
}

function SettlingSwipeHarness({
  onIndexChange,
  reducedMotion = false,
}: {
  onIndexChange: (nextIndex: number) => void;
  reducedMotion?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(1);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: (nextIndex) => {
      onIndexChange(nextIndex);
      setActiveIndex(nextIndex);
    },
    reducedMotion,
    tabCount: 4,
  });

  const setViewportRef = (node: HTMLDivElement | null) => {
    if (node) {
      setViewportWidth(node, 390);
    }

    (swipe.viewportRef as MutableRefObject<HTMLDivElement | null>).current =
      node;
  };

  return createElement(
    "div",
    {
      "data-testid": "swipe-viewport",
      onPointerCancel: swipe.onPointerCancel,
      onPointerDown: swipe.onPointerDown,
      onPointerMove: swipe.onPointerMove,
      onPointerUp: swipe.onPointerUp,
      ref: setViewportRef,
    },
    createElement("div", {
      "data-testid": "swipe-track",
      ref: swipe.trackRef,
    }),
  );
}

function ExternalSelectionHarness({
  onIndexChange,
}: {
  onIndexChange: (nextIndex: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(1);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: (nextIndex) => {
      onIndexChange(nextIndex);
      setActiveIndex(nextIndex);
    },
    reducedMotion: false,
    tabCount: 4,
  });

  const setViewportRef = (node: HTMLDivElement | null) => {
    if (node) {
      setViewportWidth(node, 390);
    }

    (swipe.viewportRef as MutableRefObject<HTMLDivElement | null>).current =
      node;
  };

  return createElement(
    "div",
    {},
    createElement(
      "button",
      {
        onClick: () => {
          setActiveIndex(3);
        },
      },
      "Jump to 3",
    ),
    createElement(
      "div",
      {
        "data-testid": "swipe-viewport",
        onPointerCancel: swipe.onPointerCancel,
        onPointerDown: swipe.onPointerDown,
        onPointerMove: swipe.onPointerMove,
        onPointerUp: swipe.onPointerUp,
        ref: setViewportRef,
      },
      createElement("div", {
        "data-testid": "swipe-track",
        ref: swipe.trackRef,
      }),
    ),
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
  type: "pointercancel" | "pointerdown" | "pointermove" | "pointerup",
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

function fireTransitionEndEvent(
  target: HTMLElement,
  propertyName: string,
) {
  const event = new Event("transitionend", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "propertyName", { value: propertyName });
  fireEvent(target, event);
}

function installAnimationFrameClock() {
  let nextFrameId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    callbacks.set(frameId, callback);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
    callbacks.delete(frameId);
  });

  const advance = (timestamp: number) => {
    const pendingCallbacks = [...callbacks.values()];
    callbacks.clear();
    act(() => {
      pendingCallbacks.forEach((callback) => callback(timestamp));
    });
  };

  return {
    advance,
  };
}

function setNonCapturingPointerApi(viewport: HTMLElement) {
  Object.assign(viewport, {
    hasPointerCapture: () => false,
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  });
}

function swipeLeftAccepted(viewport: HTMLElement, pointerId: number) {
  firePointerEvent(viewport, "pointerdown", {
    clientX: 260,
    clientY: 200,
    pointerId,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 140,
    clientY: 202,
    pointerId,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 140,
    clientY: 202,
    pointerId,
  });
}

function swipeLeftRejected(viewport: HTMLElement, pointerId: number) {
  firePointerEvent(viewport, "pointerdown", {
    clientX: 220,
    clientY: 200,
    pointerId,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 200,
    clientY: 202,
    pointerId,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 200,
    clientY: 202,
    pointerId,
  });
}

function startRejectedSwipeDrag(viewport: HTMLElement, pointerId: number) {
  firePointerEvent(viewport, "pointerdown", {
    clientX: 220,
    clientY: 200,
    pointerId,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 200,
    clientY: 202,
    pointerId,
  });
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
  vi.useRealTimers();
  vi.restoreAllMocks();
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

  test("stays on the current tab after a short quick flick", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -42,
        distanceY: 2,
        elapsedMs: 60,
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
  test("settles an accepted swipe before committing navigation", () => {
    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 6);

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(track.style.transform).toBe("translate3d(-780px, 0, 0)");
    expect(track.style.transition).toBe(
      "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    );

    fireTransitionEndEvent(track, "transform");

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("falls back to the timeout when transform never ends", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 6);

    expect(onIndexChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(379);
    });

    expect(onIndexChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(track.style.transform).toBe("translate3d(-780px, 0, 0)");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  test("settles a rejected swipe back to the active tab", () => {
    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftRejected(viewport, 7);

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");
    expect(track.style.transition).toBe(
      "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
  });

  test("keeps a rejected snap-back locked until it settles", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");

    setNonCapturingPointerApi(viewport);

    swipeLeftRejected(viewport, 14);

    const track = screen.getByTestId("swipe-track");

    swipeLeftAccepted(viewport, 15);

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");

    fireTransitionEndEvent(track, "transform");

    swipeLeftAccepted(viewport, 16);

    expect(track.style.transform).toBe("translate3d(-780px, 0, 0)");
    expect(onIndexChange).not.toHaveBeenCalled();

    fireTransitionEndEvent(track, "transform");

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("keeps a cancelled snap-back locked until it settles", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");

    setNonCapturingPointerApi(viewport);

    startRejectedSwipeDrag(viewport, 17);
    firePointerEvent(viewport, "pointercancel", {
      clientX: 200,
      clientY: 202,
      pointerId: 17,
    });

    const track = screen.getByTestId("swipe-track");

    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");
    expect(track.style.transition).toBe(
      "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    );

    swipeLeftAccepted(viewport, 18);

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");

    fireTransitionEndEvent(track, "transform");

    swipeLeftAccepted(viewport, 19);

    expect(track.style.transform).toBe("translate3d(-780px, 0, 0)");
    expect(onIndexChange).not.toHaveBeenCalled();

    fireTransitionEndEvent(track, "transform");

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("cancels a stale drag frame before a cancelled snap-back settles", () => {
    vi.useFakeTimers();
    const frameClock = installAnimationFrameClock();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    startRejectedSwipeDrag(viewport, 20);
    firePointerEvent(viewport, "pointercancel", {
      clientX: 200,
      clientY: 202,
      pointerId: 20,
    });

    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");

    frameClock.advance(16);

    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  test("commits immediately when reduced motion is enabled", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(
      createElement(SettlingSwipeHarness, {
        onIndexChange,
        reducedMotion: true,
      }),
    );
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 8);

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(track.style.transition).toBe("none");

    act(() => {
      vi.advanceTimersByTime(380);
    });

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  test("restores a rejected reduced-motion swipe after the drag frame renders", () => {
    const onIndexChange = vi.fn();
    render(
      createElement(SettlingSwipeHarness, {
        onIndexChange,
        reducedMotion: true,
      }),
    );
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");
    const frameClock = installAnimationFrameClock();

    setNonCapturingPointerApi(viewport);

    startRejectedSwipeDrag(viewport, 17);

    frameClock.advance(16);

    expect(track.style.transform).toBe("translate3d(-410px, 0, 0)");

    firePointerEvent(viewport, "pointerup", {
      clientX: 200,
      clientY: 202,
      pointerId: 17,
    });

    expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  test("ignores non-transform transition end events", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 9);

    fireTransitionEndEvent(track, "opacity");
    expect(onIndexChange).not.toHaveBeenCalled();

    fireTransitionEndEvent(track, "transform");
    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);

    fireTransitionEndEvent(track, "transform");

    act(() => {
      vi.advanceTimersByTime(380);
    });

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  test("ignores a second gesture while settling", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(SettlingSwipeHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 10);

    firePointerEvent(viewport, "pointerdown", {
      clientX: 140,
      clientY: 200,
      pointerId: 11,
    });
    firePointerEvent(viewport, "pointermove", {
      clientX: 300,
      clientY: 202,
      pointerId: 11,
    });
    firePointerEvent(viewport, "pointerup", {
      clientX: 300,
      clientY: 202,
      pointerId: 11,
    });

    fireTransitionEndEvent(track, "transform");

    expect(onIndexChange).toHaveBeenCalledTimes(1);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  test("cancels a pending settle when the active tab changes externally", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    render(createElement(ExternalSelectionHarness, { onIndexChange }));
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 12);

    fireEvent.click(screen.getByRole("button", { name: "Jump to 3" }));

    expect(track.style.transform).toBe("translate3d(-1170px, 0, 0)");
    expect(onIndexChange).not.toHaveBeenCalled();

    fireTransitionEndEvent(track, "transform");

    act(() => {
      vi.advanceTimersByTime(380);
    });

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  test("cleans up a pending settle on unmount", () => {
    vi.useFakeTimers();

    const onIndexChange = vi.fn();
    const { unmount } = render(
      createElement(SettlingSwipeHarness, { onIndexChange }),
    );
    const viewport = screen.getByTestId("swipe-viewport");
    const track = screen.getByTestId("swipe-track");

    setNonCapturingPointerApi(viewport);

    swipeLeftAccepted(viewport, 13);

    unmount();

    fireTransitionEndEvent(track, "transform");

    act(() => {
      vi.advanceTimersByTime(380);
    });

    expect(onIndexChange).not.toHaveBeenCalled();
  });

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

  test("does not capture gestures that start in an ignored nested scroll area", () => {
    const onIndexChange = vi.fn();
    render(createElement(SwipeHarness, { onIndexChange }));
    const nestedScrollArea = screen.getByTestId("nested-scroll-area");

    firePointerEvent(nestedScrollArea, "pointerdown", {
      clientX: 240,
      clientY: 200,
      pointerId: 5,
    });
    firePointerEvent(nestedScrollArea, "pointermove", {
      clientX: 80,
      clientY: 202,
      pointerId: 5,
    });
    firePointerEvent(nestedScrollArea, "pointerup", {
      clientX: 80,
      clientY: 202,
      pointerId: 5,
    });

    expect(onIndexChange).not.toHaveBeenCalled();
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
    expect(track.style.transition).toContain("transform 300ms");

    viewportObserver?.trigger({
      height: 720,
      target: viewport,
      width: 390,
    });

    expect(track.style.transition).toContain("transform 300ms");
  });
});
