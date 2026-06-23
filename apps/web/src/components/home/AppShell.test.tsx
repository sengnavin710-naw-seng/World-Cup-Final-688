import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import {
  act,
  createEvent,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "../../App";
import { renderWithQueryClient as render } from "../../test/renderWithQueryClient";

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

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

function setReducedMotionPreference(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
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

  return {
    advance(timestamp: number) {
      const pendingCallbacks = [...callbacks.values()];
      callbacks.clear();
      act(() => {
        pendingCallbacks.forEach((callback) => callback(timestamp));
      });
    },
  };
}

beforeEach(() => {
  controlledResizeObservers = [];
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
  setReducedMotionPreference(false);
  Object.defineProperty(window, "requestIdleCallback", {
    configurable: true,
    value: vi.fn(() => 1),
  });
  Object.defineProperty(window, "cancelIdleCallback", {
    configurable: true,
    value: vi.fn(),
  });
  window.localStorage.clear();
  window.localStorage.setItem(
    "wcf688-session",
    JSON.stringify({
      deviceId: "device-1",
      displayName: "Seng",
      teamCode: "ARG",
    }),
  );
  window.localStorage.setItem("wcf688-device-id", "device-1");

  global.fetch = vi.fn((input) => {
    const url = String(input);

    if (url.includes("/api/participant/session/device-1")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            participant: {
              deviceId: "device-1",
              displayName: "Seng",
              teamCode: "ARG",
            },
          }),
          { status: 200 },
        ),
      );
    }

    if (url.includes("/api/tournament/teams")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            teams: [
              {
                code: "ARG",
                name: "Argentina",
                thaiAlias: "Argentina",
                group: "A",
                flag: "ARG",
                isOwned: true,
                ownedByName: "Seng",
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }

    if (url.includes("/api/tournament/knockout")) {
      return Promise.resolve(
        new Response(JSON.stringify({ knockout: [] }), { status: 200 }),
      );
    }

    if (url.includes("/api/tournament/fixtures")) {
      return Promise.resolve(
        new Response(JSON.stringify({ fixtures: [] }), { status: 200 }),
      );
    }

    if (url.includes("/api/tournament/table")) {
      return Promise.resolve(
        new Response(JSON.stringify({ standings: [], companyPicks: [] }), {
          status: 200,
        }),
      );
    }

    if (url.includes("/api/tournament/news")) {
      return Promise.resolve(
        new Response(JSON.stringify({ news: [] }), { status: 200 }),
      );
    }

    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  }) as typeof fetch;
});

test("home defaults to knockout tab for returning participant", async () => {
  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
      "aria-selected",
      "true",
    ),
  );
});

test("opens home from the saved local session while remote verification is pending", () => {
  global.fetch = vi.fn(() => new Promise<Response>(() => {})) as typeof fetch;

  render(<App />);

  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("renders Home chrome without waiting for every tournament endpoint", async () => {
  const pendingNews = deferredResponse();
  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/news")) {
      return pendingNews.promise;
    }

    return currentFetch(input, init);
  }) as typeof fetch;

  render(<App />);

  expect(screen.getByText("World Cup Festival 688")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await screen.findByLabelText("World Cup knockout bracket")).toBeInTheDocument();
  expect(
    screen.queryByText("Loading the latest tournament dashboard..."),
  ).not.toBeInTheDocument();
});

test("does not block the knockout dashboard while team availability is pending", async () => {
  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/teams")) {
      return new Promise<Response>(() => {});
    }

    return currentFetch(input, init);
  }) as typeof fetch;

  render(<App />);

  expect(await screen.findByLabelText("World Cup knockout bracket")).toBeInTheDocument();
});

test("shows cached tab content while its query refreshes", async () => {
  const { queryClient } = render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));
  expect(await screen.findByLabelText("Fixture filters")).toBeInTheDocument();

  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/fixtures")) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: "Temporary failure" }), {
          status: 503,
        }),
      );
    }

    return currentFetch(input, init);
  }) as typeof fetch;

  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tournament", "fixtures"] });
  });

  expect(screen.getByLabelText("Fixture filters")).toBeInTheDocument();
  expect(screen.queryByLabelText("Loading Fixtures")).not.toBeInTheDocument();
  expect(
    await screen.findByText("Showing saved data. Refresh failed."),
  ).toBeInTheDocument();
});

test("prefetches the destination on tab pointer down", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.pointerDown(screen.getByRole("tab", { name: "News" }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tournament/news"),
      expect.anything(),
    );
  });
});

test("prefetches the destination on tab focus", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.focus(screen.getByRole("tab", { name: "News" }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tournament/news"),
      expect.anything(),
    );
  });
});

test("renders one shared tab indicator instead of per-button underlines", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const tabsNav = screen.getByLabelText("Home tabs");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(tabsNav.querySelector(".tab-indicator")).toBeInTheDocument();
  expect(applicationStyles).toContain(".tab-indicator");
  expect(applicationStyles).not.toContain(".tab-button::after");
});

test("recalculates the shared tab indicator when the tab row layout changes", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const tabsNav = screen.getByLabelText("Home tabs");
  const knockoutTab = screen.getByRole("tab", { name: "Knockout" });
  const indicator = tabsNav.querySelector<HTMLElement>(".tab-indicator");

  Object.defineProperties(knockoutTab, {
    offsetLeft: { configurable: true, value: 18 },
    offsetWidth: { configurable: true, value: 124 },
  });

  const tabsObserver = controlledResizeObservers.find((observer) =>
    observer.observedTargets.has(tabsNav),
  );

  expect(tabsObserver).toBeDefined();
  act(() => tabsObserver?.trigger(tabsNav));

  expect(indicator).toHaveStyle({
    transform: "translate3d(18px, 0, 0)",
    width: "124px",
  });
});

test("disables the shared tab indicator transition for reduced motion", async () => {
  setReducedMotionPreference(true);
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const indicator = screen
    .getByLabelText("Home tabs")
    .querySelector<HTMLElement>(".tab-indicator");

  expect(indicator).toHaveStyle({ transition: "none" });
});

test("clicking a far tab keeps the current tab selected until carousel settle ends", async () => {
  const frameClock = installAnimationFrameClock();
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const track = screen.getByTestId("tab-carousel-track");
  const viewport = screen.getByLabelText("Tournament tabs");
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: 390,
  });

  fireEvent.click(screen.getByRole("tab", { name: "News" }));
  frameClock.advance(16);

  expect(track.style.transform).toBe("translate3d(-1170px, 0, 0)");
  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  fireTransitionEndEvent(track, "transform");

  expect(screen.getByRole("tab", { name: "News" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("uses local loading and error states when a tab has no cached data", async () => {
  const pendingNews = deferredResponse();
  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/news")) {
      return pendingNews.promise;
    }

    return currentFetch(input, init);
  }) as typeof fetch;

  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "News" }));

  expect(screen.getByLabelText("Loading News")).toBeInTheDocument();

  await act(async () => {
    pendingNews.resolve(
      new Response(JSON.stringify({ message: "Temporary failure" }), {
        status: 503,
      }),
    );
  });

  expect(
    await screen.findByText("Unable to load News.", {}, { timeout: 3_000 }),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "News" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("World Cup Festival 688")).toBeInTheDocument();
});

test("falls back to the first fixture group when the participant has no fixtures", async () => {
  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/fixtures")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            fixtures: [
              {
                awayFlag: "🇯🇵",
                awayTeam: "JPN",
                awayTeamName: "Japan",
                group: "C",
                homeFlag: "🇧🇷",
                homeTeam: "BRA",
                homeTeamName: "Brazil",
                id: "fixture-c-1",
                kickoff: "2026-06-29T03:00:00Z",
                matchNumber: 1,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }

    return currentFetch(input, init);
  }) as typeof fetch;

  render(<App />);

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));
  const groupFilter = await screen.findByRole("button", { name: /Group/i });
  fireEvent.click(groupFilter);

  expect(
    await screen.findByRole("heading", { name: "Group C" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Brazil")).toBeInTheDocument();
});

test("uses the shared mobile gap above the knockout surface", async () => {
  render(<App />);

  const knockoutBracket = await screen.findByLabelText("World Cup knockout bracket");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(knockoutBracket.closest(".tab-panel")).toHaveClass("tab-panel-knockout");
  expect(applicationStyles).toMatch(/\.tab-panel\s*\{[^}]*padding:\s*20px;/);
  expect(applicationStyles).toMatch(
    /\.tab-panel-knockout\s*\{[^}]*padding:\s*0;/,
  );
  expect(applicationStyles).toMatch(
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.home-chrome\s*\{[^}]*margin-bottom:\s*8px;/,
  );
  expect(applicationStyles).toMatch(
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.tab-panel-knockout\s*\{[^}]*margin-top:\s*0;/,
  );
});

test("marks the News panel for compact mobile spacing", async () => {
  render(<App />);

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "News" }));
  });

  await waitFor(() => {
    expect(
      screen.getByTestId("tab-slide-News").querySelector(".tab-panel"),
    ).toHaveClass("tab-panel-news");
  });
});

test("renders table group cards without an outer container and with 8px side spacing", async () => {
  render(<App />);

  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));
  });
  const tableSlide = screen.getByTestId("tab-slide-Table");
  const tablePanel = tableSlide.querySelector(".tab-panel");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(tablePanel).toHaveClass("tab-panel-table");
  expect(applicationStyles).toMatch(
    /\.tab-panel-table\s*\{[^}]*padding:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/,
  );
  expect(applicationStyles).toMatch(
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.app-shell\s*\{[^}]*padding:\s*8px;/,
  );
});

test("moves from the knockout bracket to fixtures after a very fast forward swipe", async () => {
  render(<App />);

  const mobileBracket = await screen.findByLabelText("World Cup knockout rounds");
  const track = screen.getByTestId("tab-carousel-track");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      value: 0,
      writable: true,
    },
    scrollTo: {
      configurable: true,
      value: vi.fn(),
    },
  });

  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 100 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);

  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 70, clientY: 104 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_100 });
  fireEvent(scroller!, touchEnd);

  fireTransitionEndEvent(track, "transform");

  expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("uses the same page frame while leaving the knockout tab", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const shell = document.querySelector(".app-shell");
  const chrome = document.querySelector(".home-chrome");

  expect(shell).not.toHaveClass("app-shell-knockout");
  expect(chrome).not.toHaveClass("home-chrome-knockout");

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  expect(shell).not.toHaveClass("app-shell-knockout");
  expect(chrome).not.toHaveClass("home-chrome-knockout");
});

test("renders fixture filters in a toolbar above the fixtures panel", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  const fixtureFilters = await screen.findByLabelText("Fixture filters");
  const fixtureList = document.querySelector(".fixture-list");

  expect(fixtureFilters.closest(".fixture-shell-toolbar")).toBeInTheDocument();
  expect(fixtureFilters.closest(".tab-carousel-slide")).toBeInTheDocument();
  expect(fixtureFilters.closest(".tab-panel")).not.toBeInTheDocument();
  expect(fixtureFilters).toHaveClass("fixture-filter-row-fill");
  expect(fixtureFilters.querySelectorAll("button")).toHaveLength(4);
  expect(fixtureList?.closest(".tab-panel")).toHaveClass("tab-panel-fixtures");
});

test("uses the multilingual application font stack", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toContain(
    'font-family: "Inter", "Noto Sans Thai", "Noto Sans Myanmar", system-ui, sans-serif;',
  );
});

test("defines the carousel layout and local tab states", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.tab-carousel-viewport\s*\{[\s\S]*?overflow:\s*clip;[\s\S]*?touch-action:\s*pan-y;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-carousel-track\s*\{[\s\S]*?display:\s*flex;[\s\S]*?will-change:\s*transform;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-carousel-slide\s*\{[\s\S]*?flex:\s*0 0 100%;/,
  );
  expect(applicationStyles).toContain(".tab-local-skeleton");
  expect(applicationStyles).toContain(".tab-refresh-notice");
  expect(applicationStyles).not.toContain("@keyframes tab-screen-enter-right");
  expect(applicationStyles).not.toMatch(/\.tab-button:hover\s*\{/);
});

test("uses compact mobile spacing around fixture date headings", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.fixture-section-card\s*\{[\s\S]*?padding:\s*4px 14px 16px;/,
  );
  expect(applicationStyles).toMatch(
    /\.fixture-match-row\s*\{[\s\S]*?padding-block:\s*10px;/,
  );
  expect(applicationStyles).toMatch(
    /\.fixture-section-card \+ \.fixture-section-card\s*\{[\s\S]*?padding-top:\s*10px;/,
  );
});
