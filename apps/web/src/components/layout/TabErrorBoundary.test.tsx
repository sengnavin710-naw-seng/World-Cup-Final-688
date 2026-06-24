import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TabErrorBoundary } from "./TabErrorBoundary";

function BrokenTab(): never {
  throw new Error("chunk failed");
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

test("shows a local tab error when a lazy tab fails to render", () => {
  render(
    <TabErrorBoundary label="News" resetKey="News">
      <BrokenTab />
    </TabErrorBoundary>,
  );

  expect(screen.getByText("Unable to load News.")).toBeInTheDocument();
});

test("resets the failed tab when the active tab changes", async () => {
  const { rerender } = render(
    <TabErrorBoundary label="News" resetKey="News">
      <BrokenTab />
    </TabErrorBoundary>,
  );

  rerender(
    <TabErrorBoundary label="Fixtures" resetKey="Fixtures">
      <div>Fixtures recovered</div>
    </TabErrorBoundary>,
  );

  expect(await screen.findByText("Fixtures recovered")).toBeInTheDocument();
});
