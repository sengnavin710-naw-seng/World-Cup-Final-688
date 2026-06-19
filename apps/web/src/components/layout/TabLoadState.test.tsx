import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { TabLoadState, TabRefreshNotice } from "./TabLoadState";

describe("TabLoadState", () => {
  test("exposes an accessible loading label", () => {
    render(<TabLoadState label="Knockout" state="loading" />);

    expect(screen.getByLabelText("Loading Knockout")).toBeInTheDocument();
  });

  test("calls onRetry from the error state retry button", () => {
    const onRetry = vi.fn();

    render(<TabLoadState label="Knockout" onRetry={onRetry} state="error" />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("TabRefreshNotice", () => {
  test("calls onRetry from the refresh again button", () => {
    const onRetry = vi.fn();

    render(<TabRefreshNotice onRetry={onRetry} />);

    expect(screen.getByRole("status")).toHaveClass("tab-refresh-notice");

    fireEvent.click(screen.getByRole("button", { name: "Refresh again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
