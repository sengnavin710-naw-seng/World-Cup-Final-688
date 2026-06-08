import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../App";
import { TeamSelectionScreen } from "./TeamSelectionScreen";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";
const BURMESE_CURRENT_NAME = "\u1021\u1000\u103a\u1001\u101b\u102c";

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = vi.fn((input, init) => {
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

    if (url.includes("/api/tournament/knockout")) {
      return Promise.resolve(new Response(JSON.stringify({ knockout: [] }), { status: 200 }));
    }

    if (url.includes("/api/tournament/fixtures")) {
      return Promise.resolve(new Response(JSON.stringify({ fixtures: [] }), { status: 200 }));
    }

    if (url.includes("/api/tournament/table")) {
      return Promise.resolve(
        new Response(JSON.stringify({ standings: [], companyPicks: [] }), { status: 200 }),
      );
    }

    if (url.includes("/api/tournament/news")) {
      return Promise.resolve(new Response(JSON.stringify({ news: [] }), { status: 200 }));
    }

    if (
      url.includes("/api/participant/select") ||
      url.includes("/api/participant/change")
    ) {
      const participant = JSON.parse(String(init?.body));
      return Promise.resolve(
        new Response(JSON.stringify({ participant }), { status: 201 }),
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

test("opens the display name dialog and submits a trimmed Burmese name", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: `  ${BURMESE_NAME}  ` },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    const selectionCall = vi.mocked(global.fetch).mock.calls.find(([input]) =>
      String(input).includes("/api/participant/select"),
    );
    expect(selectionCall).toBeDefined();
    expect(JSON.parse(String(selectionCall?.[1]?.body))).toMatchObject({
      displayName: BURMESE_NAME,
      teamCode: "ARG",
    });
  });
});

test("cancelling the display name dialog does not save the selection", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByPlaceholderText("Display name")).not.toBeInTheDocument();
  expect(
    vi.mocked(global.fetch).mock.calls.some(([input]) =>
      String(input).includes("/api/participant/select"),
    ),
  ).toBe(false);
});

test("keeps the dialog open and shows an API error when saving fails", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          teams: [
            {
              code: "ARG",
              name: "Argentina",
              group: "J",
              flag: "ARG",
              isOwned: false,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "failed" }), { status: 500 }),
    ) as typeof fetch;

  render(
    <TeamSelectionScreen
      brandName="World Cup Festival 688"
      mode="create"
      onSelectionSaved={vi.fn()}
    />,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "Seng" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Unable to save your team selection right now."),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Display name")).toBeInTheDocument();
});

test("prefills the current display name in change mode", async () => {
  render(
    <TeamSelectionScreen
      brandName="World Cup Festival 688"
      currentDisplayName={BURMESE_CURRENT_NAME}
      currentTeamCode="ARG"
      mode="change"
      onSelectionSaved={vi.fn()}
    />,
  );

  await screen.findByRole("button", { name: /Argentina/i });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(screen.getByPlaceholderText("Display name")).toHaveValue(BURMESE_CURRENT_NAME);
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
  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "Seng" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("That team was just taken by someone else. Please choose another team."),
  ).toBeInTheDocument();

  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled());
  expect(screen.getByRole("button", { name: /Argentina/i })).toBeDisabled();
});
