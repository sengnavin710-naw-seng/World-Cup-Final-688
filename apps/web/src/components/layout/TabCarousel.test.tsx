import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { HomeTab } from "../../lib/tournamentQueries";
import { TabCarousel } from "./TabCarousel";

const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;
const defaultSlideHeights = {
  "tab-slide-Fixtures": 640,
  "tab-slide-Knockout": 480,
  "tab-slide-News": 560,
  "tab-slide-Table": 920,
} as const;

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

  trigger(target: Element) {
    if (!this.observedTargets.has(target)) {
      return;
    }

    this.callback([{ target } as ResizeObserverEntry], this);
  }
}

let controlledResizeObservers: ControlledResizeObserver[] = [];
let slideHeights = new Map<string, number>();
const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight",
);

function Harness({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <TabCarousel
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      reducedMotion={reducedMotion}
      renderTab={(tab: HomeTab) => <div>{`${tab} content`}</div>}
      tabs={tabs}
    />
  );
}

function RenderCountingHarness({
  renderTab,
}: {
  renderTab: (tab: HomeTab) => ReactElement;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <TabCarousel
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      reducedMotion={false}
      renderTab={renderTab}
      tabs={tabs}
    />
  );
}

function RequestHarness() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [requestId, setRequestId] = useState(0);
  const [motionText, setMotionText] = useState("0:null:idle");

  return (
    <>
      <button
        type="button"
        onClick={() => setRequestId((current) => current + 1)}
      >
        Request News
      </button>
      <output data-testid="motion-state">{motionText}</output>
      <TabCarousel
        activeIndex={activeIndex}
        navigationRequest={
          requestId > 0 ? { id: requestId, index: 3 } : null
        }
        onActiveIndexChange={setActiveIndex}
        onMotionStateChange={(state) =>
          setMotionText(
            `${state.visualIndex}:${state.pendingIndex}:${state.phase}`,
          )
        }
        reducedMotion={false}
        renderTab={(tab: HomeTab) => <div>{`${tab} content`}</div>}
        tabs={tabs}
      />
    </>
  );
}

function UnstableMotionCallbackHarness() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);

  return (
    <>
      <output data-testid="motion-notification-count">
        {notifications.length}
      </output>
      <TabCarousel
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onMotionStateChange={(state) => {
          setNotifications((current) => {
            if (current.length > 1) {
              throw new Error("motion state notified repeatedly");
            }

            return [
              ...current,
              `${state.visualIndex}:${state.pendingIndex}:${state.phase}`,
            ];
          });
        }}
        reducedMotion={false}
        renderTab={(tab: HomeTab) => <div>{`${tab} content`}</div>}
        tabs={tabs}
      />
    </>
  );
}

function setViewportWidth(viewport: HTMLElement, width: number) {
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: width,
  });
}

function setSlideHeight(tab: (typeof tabs)[number], height: number) {
  slideHeights.set(`tab-slide-${tab}`, height);
}

function findObserverFor(target: Element) {
  return controlledResizeObservers.find((observer) =>
    observer.observedTargets.has(target),
  );
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

function fireTransitionEndEvent(target: HTMLElement, propertyName: string) {
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

function swipeLeft(viewport: HTMLElement, pointerId: number) {
  firePointerEvent(viewport, "pointerdown", {
    clientX: 300,
    clientY: 100,
    pointerId,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 200,
    clientY: 102,
    pointerId,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 200,
    clientY: 102,
    pointerId,
  });
}

beforeEach(() => {
  controlledResizeObservers = [];
  slideHeights = new Map(Object.entries(defaultSlideHeights));
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      const testId = this.getAttribute("data-testid");

      if (testId && slideHeights.has(testId)) {
        return slideHeights.get(testId);
      }

      return originalScrollHeightDescriptor?.get?.call(this) ?? 0;
    },
  });
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
});

afterEach(() => {
  if (originalScrollHeightDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      originalScrollHeightDescriptor,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
  }

  vi.unstubAllGlobals();
});

describe("TabCarousel", () => {
  test("mounts only the active and adjacent tab content initially", () => {
    render(<Harness />);

    expect(screen.getByText("Knockout content")).toBeInTheDocument();
    expect(screen.getByText("Fixtures content")).toBeInTheDocument();
    expect(screen.queryByText("Table content")).not.toBeInTheDocument();
    expect(screen.queryByText("News content")).not.toBeInTheDocument();
  });

  test("advances exactly one slide after a qualifying left gesture", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    const track = screen.getByTestId("tab-carousel-track");
    setViewportWidth(viewport, 390);

    swipeLeft(viewport, 1);
    fireTransitionEndEvent(track, "transform");

    expect(screen.getByText("Table content")).toBeInTheDocument();
    expect(screen.queryByText("News content")).not.toBeInTheDocument();
  });

  test("stops at Table after two rapid qualifying gestures", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    const track = screen.getByTestId("tab-carousel-track");
    setViewportWidth(viewport, 390);

    swipeLeft(viewport, 1);
    fireTransitionEndEvent(track, "transform");
    swipeLeft(viewport, 2);
    fireTransitionEndEvent(track, "transform");

    expect(screen.getByTestId("tab-slide-Table")).not.toHaveAttribute(
      "aria-hidden",
    );
    expect(screen.getByTestId("tab-slide-News")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("hides and makes inactive slides inert", () => {
    render(<Harness />);

    const activeSlide = screen.getByTestId("tab-slide-Knockout");
    const inactiveSlide = screen.getByTestId("tab-slide-Fixtures");

    expect(inactiveSlide).toHaveAttribute("aria-hidden", "true");
    expect(inactiveSlide).toHaveAttribute("inert");
    expect(activeSlide).not.toHaveAttribute("aria-hidden");
    expect(activeSlide).not.toHaveAttribute("inert");
  });

  test("observes only the active slide for viewport height", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    const track = screen.getByTestId("tab-carousel-track");
    const knockoutSlide = screen.getByTestId("tab-slide-Knockout");
    const fixturesSlide = screen.getByTestId("tab-slide-Fixtures");
    const tableSlide = screen.getByTestId("tab-slide-Table");
    const knockoutObserver = findObserverFor(knockoutSlide);

    expect(viewport).toHaveStyle({
      height: "480px",
    });
    expect(knockoutObserver).toBeDefined();
    expect(findObserverFor(fixturesSlide)).toBeUndefined();

    setViewportWidth(viewport, 390);
    swipeLeft(viewport, 1);
    fireTransitionEndEvent(track, "transform");

    const fixturesObserver = findObserverFor(fixturesSlide);

    expect(knockoutObserver?.disconnect).toHaveBeenCalledTimes(1);
    expect(fixturesObserver).toBeDefined();
    expect(findObserverFor(tableSlide)).toBeUndefined();
    expect(viewport).toHaveStyle({
      height: "640px",
    });

    setSlideHeight("Fixtures", 700);
    fixturesObserver?.trigger(fixturesSlide);

    expect(viewport).toHaveStyle({
      height: "700px",
    });

    setSlideHeight("Knockout", 999);
    knockoutObserver?.trigger(knockoutSlide);

    expect(viewport).toHaveStyle({
      height: "700px",
    });
  });

  test("disables the track transition when reduced motion is enabled", () => {
    render(<Harness reducedMotion />);

    expect(screen.getByTestId("tab-carousel-track")).toHaveStyle({
      transition: "none",
    });
  });

  test("animates a far navigation request without committing early", () => {
    const frameClock = installAnimationFrameClock();
    render(<RequestHarness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    const track = screen.getByTestId("tab-carousel-track");
    setViewportWidth(viewport, 390);

    fireEvent.click(screen.getByRole("button", { name: "Request News" }));
    frameClock.advance(16);

    expect(track.style.transform).toBe("translate3d(-1170px, 0, 0)");
    expect(track.style.transition).toBe(
      "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
    expect(screen.getByTestId("motion-state")).toHaveTextContent(
      "3:3:settling",
    );
    expect(screen.getByTestId("tab-slide-Knockout")).not.toHaveAttribute(
      "aria-hidden",
    );

    fireTransitionEndEvent(track, "transform");

    expect(screen.getByTestId("tab-slide-News")).not.toHaveAttribute(
      "aria-hidden",
    );
  });

  test("does not rerender tab contents for repeated drag-frame visual updates", () => {
    const frameClock = installAnimationFrameClock();
    const renderTab = vi.fn((tab: HomeTab) => <div>{`${tab} content`}</div>);
    render(<RenderCountingHarness renderTab={renderTab} />);
    const viewport = screen.getByLabelText("Tournament tabs");
    setViewportWidth(viewport, 390);

    firePointerEvent(viewport, "pointerdown", {
      clientX: 300,
      clientY: 100,
      pointerId: 1,
    });
    firePointerEvent(viewport, "pointermove", {
      clientX: 220,
      clientY: 102,
      pointerId: 1,
    });
    frameClock.advance(16);
    const callsAfterFirstDragFrame = renderTab.mock.calls.length;

    firePointerEvent(viewport, "pointermove", {
      clientX: 160,
      clientY: 102,
      pointerId: 1,
    });
    frameClock.advance(32);

    expect(renderTab).toHaveBeenCalledTimes(callsAfterFirstDragFrame);
  });

  test("mounts source, target, and target neighbor slides while settling", () => {
    render(<RequestHarness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    setViewportWidth(viewport, 390);

    fireEvent.click(screen.getByRole("button", { name: "Request News" }));

    expect(screen.getByText("Knockout content")).toBeInTheDocument();
    expect(screen.getByText("Fixtures content")).toBeInTheDocument();
    expect(screen.getByText("Table content")).toBeInTheDocument();
    expect(screen.getByText("News content")).toBeInTheDocument();
  });

  test("does not replay unchanged motion state for unstable callbacks", () => {
    render(<UnstableMotionCallbackHarness />);

    expect(screen.getByTestId("motion-notification-count")).toHaveTextContent(
      "1",
    );
  });
});
