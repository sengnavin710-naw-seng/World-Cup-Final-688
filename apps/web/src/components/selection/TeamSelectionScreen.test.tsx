import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = vi.fn((input) => {
    const url = String(input);

    if (url.includes("/api/participant/session/")) {
      return Promise.resolve(
        new Response(JSON.stringify({ participant: null }), { status: 200 }),
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
                isOwned: false,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }

    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  }) as typeof fetch;
});

test("renders the World Cup Festival 688 brand on first load", async () => {
  render(<App />);
  expect(await screen.findByText("World Cup Festival 688")).toBeInTheDocument();
});

test("requires team selection before enabling continue", async () => {
  render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Search teams")).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
});
