import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

test("reloads team availability and clears the selection after a conflict", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementationOnce((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/participant/session/")) {
        return Promise.resolve(new Response(JSON.stringify({ participant: null }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    })
    .mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            teams: [
              {
                code: "ARG",
                name: "Argentina",
                thaiAlias: "Argentina",
                group: "A",
                flag: "ARG",
                isOwned: false,
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )
    .mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: "SELECTION_CONFLICT", message: "conflict" }),
          { status: 409 },
        ),
      ),
    )
    .mockImplementationOnce(() =>
      Promise.resolve(
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
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

  global.fetch = fetchMock as typeof fetch;

  render(<App />);

  const teamButton = await screen.findByRole("button", { name: /Argentina/i });
  fireEvent.click(teamButton);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(
    await screen.findByText("That team was just taken by someone else. Please choose another team."),
  ).toBeInTheDocument();

  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled());
  expect(screen.getByRole("button", { name: /Argentina/i })).toBeDisabled();
});
