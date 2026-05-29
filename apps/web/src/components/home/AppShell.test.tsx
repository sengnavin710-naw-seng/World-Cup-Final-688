import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

beforeEach(() => {
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
