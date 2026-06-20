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

beforeEach(() => {
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

test("renders the knockout panel as a full-bleed bracket surface", async () => {
  render(<App />);

  const knockoutBracket = await screen.findByLabelText("World Cup knockout bracket");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(knockoutBracket.closest(".tab-panel")).toHaveClass("tab-panel-knockout");
  expect(applicationStyles).toMatch(/\.tab-panel\s*\{[^}]*padding:\s*20px;/);
  expect(applicationStyles).toMatch(
    /\.tab-panel-knockout\s*\{[^}]*padding:\s*0;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-panel-knockout\s*\{[^}]*margin-top:\s*-8px;/,
  );
});

test("moves from the knockout bracket to fixtures after a very fast forward swipe", async () => {
  render(<App />);

  const mobileBracket = await screen.findByLabelText("World Cup knockout rounds");
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
