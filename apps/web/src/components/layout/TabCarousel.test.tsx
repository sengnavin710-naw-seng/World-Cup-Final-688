import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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
});
