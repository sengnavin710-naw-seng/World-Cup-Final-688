import { useEffect, useId, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");

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

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-labelledby={`${inputId}-title`}
        aria-modal="true"
        className="dialog-card display-name-dialog"
        role="dialog"
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
            <span>Display name</span>
            <input
              ref={inputRef}
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
            <p className="error-text" role="status">
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
