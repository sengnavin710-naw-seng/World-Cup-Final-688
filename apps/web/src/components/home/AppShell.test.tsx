import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

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
                thaiAlias: "อาร์เจนตินา",
                group: "A",
                flag: "🇦🇷",
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
        new Response(JSON.stringify({ standings: [], companyPicks: [] }), { status: 200 }),
      );
    }

    if (url.includes("/api/tournament/news")) {
      return Promise.resolve(new Response(JSON.stringify({ news: [] }), { status: 200 }));
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

test("renders the knockout panel as a full-bleed bracket surface", async () => {
  render(<App />);

  const knockoutBracket = await screen.findByLabelText("World Cup knockout bracket");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(knockoutBracket.closest(".tab-panel")).toHaveClass("tab-panel-knockout");
  expect(applicationStyles).toMatch(
    /\.tab-panel\s*\{[^}]*padding:\s*20px;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-panel-knockout\s*\{[^}]*padding:\s*0;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-panel-knockout\s*\{[^}]*margin-top:\s*-8px;/,
  );
});

test("does not change tabs when a vertical scroll drifts horizontally", async () => {
  render(<App />);

  const knockoutBracket = await screen.findByLabelText("World Cup knockout bracket");
  const tabPanel = knockoutBracket.closest(".tab-panel");

  expect(tabPanel).toBeInstanceOf(HTMLElement);

  fireEvent.touchStart(tabPanel!, {
    changedTouches: [{ clientX: 120, clientY: 100 }],
  });
  fireEvent.touchEnd(tabPanel!, {
    changedTouches: [{ clientX: 60, clientY: 300 }],
  });

  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("changes tabs for a primarily horizontal swipe", async () => {
  render(<App />);

  const knockoutBracket = await screen.findByLabelText("World Cup knockout bracket");
  const tabPanel = knockoutBracket.closest(".tab-panel");

  expect(tabPanel).toBeInstanceOf(HTMLElement);

  fireEvent.touchStart(tabPanel!, {
    changedTouches: [{ clientX: 140, clientY: 100 }],
  });
  fireEvent.touchEnd(tabPanel!, {
    changedTouches: [{ clientX: 60, clientY: 110 }],
  });

  expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("changes tabs when swiping the active tab screen outside the panel", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const activeScreen = document.querySelector('[data-tab-screen="Knockout"]');
  expect(activeScreen).toBeInstanceOf(HTMLElement);

  fireEvent.touchStart(activeScreen!, {
    changedTouches: [{ clientX: 150, clientY: 100 }],
  });
  fireEvent.touchEnd(activeScreen!, {
    changedTouches: [{ clientX: 70, clientY: 108 }],
  });

  expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("slides the previous screen out while the next screen enters", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  const outgoing = document.querySelector('[data-tab-screen="Knockout"]');
  const incoming = document.querySelector('[data-tab-screen="Fixtures"]');

  expect(outgoing).toHaveClass("tab-screen-outgoing", "tab-screen-exit-left");
  expect(outgoing).toHaveAttribute("aria-hidden", "true");
  expect(incoming).toHaveClass("tab-screen-incoming", "tab-screen-enter-right");

  fireEvent.animationEnd(incoming!);

  expect(document.querySelector('[data-tab-screen="Knockout"]')).not.toBeInTheDocument();
  expect(document.querySelector('[data-tab-screen="Fixtures"]')).toBeInTheDocument();
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

  const incoming = document.querySelector('[data-tab-screen="Fixtures"]');
  fireEvent.animationEnd(incoming!);

  expect(shell).not.toHaveClass("app-shell-knockout");
  expect(chrome).not.toHaveClass("home-chrome-knockout");
});

test("reverses slide direction when navigating to a previous tab", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "Table" }));

  const tableScreen = document.querySelector('[data-tab-screen="Table"]');
  expect(tableScreen).toBeInTheDocument();
  fireEvent.animationEnd(tableScreen!);

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  expect(document.querySelector('[data-tab-screen="Table"]')).toHaveClass(
    "tab-screen-exit-right",
  );
  expect(document.querySelector('[data-tab-screen="Fixtures"]')).toHaveClass(
    "tab-screen-enter-left",
  );
});

test("ignores repeated tab changes while a slide transition is active", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));
  fireEvent.click(screen.getByRole("tab", { name: "Table" }));

  expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});

test("changes tabs immediately when reduced motion is preferred", async () => {
  setReducedMotionPreference(true);
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  expect(document.querySelector('[data-tab-screen="Knockout"]')).not.toBeInTheDocument();
  expect(document.querySelector('[data-tab-screen="Fixtures"]')).toBeInTheDocument();
  expect(document.querySelector(".tab-screen-outgoing")).not.toBeInTheDocument();
});

test("renders fixture filters in a toolbar above the fixtures panel", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  const fixtureFilters = await screen.findByLabelText("Fixture filters");
  const fixtureList = document.querySelector(".fixture-list");

  expect(fixtureFilters.closest(".fixture-shell-toolbar")).toBeInTheDocument();
  expect(fixtureFilters.closest('[data-tab-screen="Fixtures"]')).toBeInTheDocument();
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

test("defines coordinated tab screen slide animations", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.tab-transition-viewport\s*\{[\s\S]*?overflow-x:\s*clip;/,
  );
  expect(applicationStyles).toContain("animation-duration: 280ms;");
  expect(applicationStyles).toContain("@keyframes tab-screen-enter-right");
  expect(applicationStyles).toContain("@keyframes tab-screen-enter-left");
  expect(applicationStyles).toContain("@keyframes tab-screen-exit-left");
  expect(applicationStyles).toContain("@keyframes tab-screen-exit-right");
  expect(applicationStyles).toMatch(
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none;/,
  );
});
