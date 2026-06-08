import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DisplayNameDialog } from "./DisplayNameDialog";

const defaultProps = {
  initialValue: "",
  open: true,
  submitting: false,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("does not render when closed", () => {
  render(<DisplayNameDialog {...defaultProps} open={false} />);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("requires a display name before confirming", () => {
  const onConfirm = vi.fn();

  render(<DisplayNameDialog {...defaultProps} onConfirm={onConfirm} />);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("status")).toHaveTextContent("Display name is required.");
  expect(onConfirm).not.toHaveBeenCalled();
});

test("trims and submits a Burmese display name", () => {
  const onConfirm = vi.fn();

  render(<DisplayNameDialog {...defaultProps} onConfirm={onConfirm} />);

  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "  အောင်ကျော်သူ  " },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Display name form" }));

  expect(onConfirm).toHaveBeenCalledWith("အောင်ကျော်သူ");
});

test("prefills and focuses the input, resets on reopen, and supports cancel", () => {
  const onCancel = vi.fn();
  const { rerender } = render(
    <DisplayNameDialog
      {...defaultProps}
      initialValue="အောင်ကျော်ဟိန်း"
      onCancel={onCancel}
    />,
  );

  const input = screen.getByLabelText("Display name");
  expect(input).toHaveValue("အောင်ကျော်ဟိန်း");
  expect(input).toHaveFocus();

  fireEvent.change(input, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("status")).toHaveTextContent("Display name is required.");

  rerender(
    <DisplayNameDialog
      {...defaultProps}
      initialValue="အောင်ကျော်ဟိန်း"
      open={false}
      onCancel={onCancel}
    />,
  );
  rerender(
    <DisplayNameDialog
      {...defaultProps}
      initialValue="Seng"
      onCancel={onCancel}
    />,
  );

  expect(screen.getByLabelText("Display name")).toHaveValue("Seng");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Display name")).toHaveFocus();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledOnce();
});

test("rejects a display name longer than 80 characters after trimming", () => {
  const onConfirm = vi.fn();

  render(<DisplayNameDialog {...defaultProps} onConfirm={onConfirm} />);

  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: ` ${"a".repeat(81)} ` },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("status")).toHaveTextContent(
    "Display name must be 80 characters or fewer.",
  );
  expect(onConfirm).not.toHaveBeenCalled();
});

test("submits with Enter and gives local validation priority over submit errors", () => {
  const onConfirm = vi.fn();

  render(
    <DisplayNameDialog
      {...defaultProps}
      submitError="Unable to save your team selection right now."
      onConfirm={onConfirm}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent(
    "Unable to save your team selection right now.",
  );

  fireEvent.submit(screen.getByRole("form", { name: "Display name form" }));
  expect(screen.getByRole("status")).toHaveTextContent("Display name is required.");

  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "Seng" },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Display name form" }));

  expect(onConfirm).toHaveBeenCalledWith("Seng");
});

test("disables the form controls while submitting", () => {
  render(<DisplayNameDialog {...defaultProps} submitting />);

  expect(screen.getByLabelText("Display name")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
});
