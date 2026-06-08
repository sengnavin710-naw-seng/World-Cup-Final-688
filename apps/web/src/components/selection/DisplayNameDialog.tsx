import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type DisplayNameDialogProps = {
  initialValue: string;
  open: boolean;
  submitError?: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (displayName: string) => void;
};

export function DisplayNameDialog({
  initialValue,
  open,
  submitError = "",
  submitting,
  onCancel,
  onConfirm,
}: DisplayNameDialogProps) {
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      previousActiveElement?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setValue(initialValue);
    setValidationError("");
    inputRef.current?.focus();
  }, [initialValue, open]);

  if (!open) return null;

  const handleSubmit = () => {
    const displayName = value.trim();

    if (!displayName) {
      setValidationError("Display name is required.");
      return;
    }

    if (displayName.length > 80) {
      setValidationError("Display name must be 80 characters or fewer.");
      return;
    }

    setValidationError("");
    onConfirm(displayName);
  };

  const errorMessage = validationError || submitError;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorMessage);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (!submitting) {
        event.preventDefault();
        onCancel();
      }
      return;
    }

    if (event.key === "Enter" && event.target === inputRef.current) {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "input:not([disabled]), button:not([disabled])",
      ) ?? [],
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const activeIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? activeIndex <= 0
        ? focusableElements.length - 1
        : activeIndex - 1
      : activeIndex === focusableElements.length - 1
        ? 0
        : activeIndex + 1;

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        ref={dialogRef}
        aria-labelledby={`${inputId}-title`}
        aria-modal="true"
        className="dialog-card display-name-dialog"
        role="dialog"
        onKeyDown={handleKeyDown}
      >
        <h3 id={`${inputId}-title`}>Your Display Name</h3>
        <form
          aria-label="Display name form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <label className="display-name-field" htmlFor={inputId}>
            <input
              ref={inputRef}
              aria-label="Display name"
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
              className="text-input"
              disabled={submitting}
              id={inputId}
              placeholder="Display name"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setValidationError("");
              }}
            />
          </label>
          {errorMessage ? (
            <p className="error-text" id={errorId} role="status">
              {errorMessage}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={submitting}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
