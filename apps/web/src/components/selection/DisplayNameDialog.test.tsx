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

test("does not render a visible display name field label", () => {
  const { container } = render(<DisplayNameDialog {...defaultProps} />);

  expect(container.querySelector(".display-name-field > span")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Display name")).toBeInTheDocument();
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

test("traps focus within the dialog", () => {
  render(<DisplayNameDialog {...defaultProps} />);

  const input = screen.getByLabelText("Display name");
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const saveButton = screen.getByRole("button", { name: "Save" });

  expect(input).toHaveFocus();

  fireEvent.keyDown(input, { key: "Tab" });
  expect(cancelButton).toHaveFocus();

  fireEvent.keyDown(cancelButton, { key: "Tab" });
  expect(saveButton).toHaveFocus();

  fireEvent.keyDown(saveButton, { key: "Tab" });
  expect(input).toHaveFocus();

  fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
  expect(saveButton).toHaveFocus();
});

test("cancels with Escape unless submitting", () => {
  const onCancel = vi.fn();
  const { rerender } = render(
    <DisplayNameDialog {...defaultProps} onCancel={onCancel} />,
  );

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledOnce();

  rerender(
    <DisplayNameDialog {...defaultProps} submitting onCancel={onCancel} />,
  );
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledOnce();
});

test("restores focus when the dialog closes or unmounts", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();

  const { rerender, unmount } = render(<DisplayNameDialog {...defaultProps} />);
  expect(screen.getByLabelText("Display name")).toHaveFocus();

  rerender(<DisplayNameDialog {...defaultProps} open={false} />);
  expect(trigger).toHaveFocus();

  rerender(<DisplayNameDialog {...defaultProps} />);
  expect(screen.getByLabelText("Display name")).toHaveFocus();

  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
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

test("gives local validation priority over submit errors and describes the error", () => {
  render(
    <DisplayNameDialog
      {...defaultProps}
      submitError="Unable to save your team selection right now."
    />,
  );

  const input = screen.getByLabelText("Display name");
  const submitError = screen.getByRole("status");
  expect(submitError).toHaveTextContent(
    "Unable to save your team selection right now.",
  );
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", submitError.id);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  const validationError = screen.getByRole("status");
  expect(validationError).toHaveTextContent("Display name is required.");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", validationError.id);
});

test("submits with the Enter key", () => {
  const onConfirm = vi.fn();

  render(<DisplayNameDialog {...defaultProps} onConfirm={onConfirm} />);

  const input = screen.getByLabelText("Display name");
  fireEvent.change(input, { target: { value: "Seng" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  expect(onConfirm).toHaveBeenCalledWith("Seng");
});

test("disables the form controls while submitting", () => {
  render(<DisplayNameDialog {...defaultProps} submitting />);

  expect(screen.getByLabelText("Display name")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
});
