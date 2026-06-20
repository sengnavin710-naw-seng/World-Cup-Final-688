import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { HomeTab } from "../../lib/tournamentQueries";
import { TabCarousel } from "./TabCarousel";

const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;

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
  class ResizeObserverStub implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    disconnect = vi.fn();
    unobserve = vi.fn();

    observe = vi.fn((target: Element) => {
      Object.defineProperty(target, "scrollHeight", {
        configurable: true,
        value: 480,
      });
      this.callback([{ target } as ResizeObserverEntry], this);
    });
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
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
    setViewportWidth(viewport, 390);

    swipeLeft(viewport, 1);

    expect(screen.getByText("Table content")).toBeInTheDocument();
    expect(screen.queryByText("News content")).not.toBeInTheDocument();
  });

  test("stops at Table after two rapid qualifying gestures", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Tournament tabs");
    setViewportWidth(viewport, 390);

    swipeLeft(viewport, 1);
    swipeLeft(viewport, 2);

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

  test("sets the viewport height from the active slide", () => {
    render(<Harness />);

    expect(screen.getByLabelText("Tournament tabs")).toHaveStyle({
      height: "480px",
    });
  });

  test("disables the track transition when reduced motion is enabled", () => {
    render(<Harness reducedMotion />);

    expect(screen.getByTestId("tab-carousel-track")).toHaveStyle({
      transition: "none",
    });
  });
});
