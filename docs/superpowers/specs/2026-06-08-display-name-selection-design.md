# Display Name Selection Design

## Goal

Restore participant display names to the team-selection flow. A participant chooses a team first, then enters a display name in a modal before the selection is saved.

## Selection Flow

1. The participant selects an available national team.
2. The participant presses `Continue`.
3. A display-name dialog opens instead of saving immediately.
4. The dialog contains an input with the placeholder `Display name`.
5. In create mode, the field starts empty.
6. In change-team mode, the field is prefilled with the participant's current display name.
7. The participant confirms the dialog.
8. The trimmed display name and selected team are submitted together.
9. On success, the session is saved locally and the participant enters Home.

Closing or cancelling the dialog returns to team selection without changing the selected team or saving anything.

## Validation

- Display name is required.
- Leading and trailing whitespace is removed.
- Maximum length is 80 characters after trimming. Frontend and backend apply the same validation.
- Burmese, Thai, English, and mixed-script names are accepted.
- Full names and partial name segments may be duplicated.
- Device ID remains the participant identity; display name is presentation data only.
- Invalid input keeps the dialog open and shows an inline error.

Examples of valid Burmese display names:

- `အောင်ကျော်သူ`
- `အောင်ကျော်ဟိန်း`

## Components

### DisplayNameDialog

A dedicated dialog component owns:

- Display-name input
- Required and length validation
- Cancel and save actions
- Submitting state
- Accessible dialog title, label, focus, and error status

It does not call the API directly. It returns the validated display name to `TeamSelectionScreen`.

### TeamSelectionScreen

`TeamSelectionScreen` continues to own the selected team and API submission.

- `Continue` opens `DisplayNameDialog`.
- Confirming the dialog builds the participant payload.
- Create mode uses `createSelection`.
- Change mode uses `changeSelection`.
- API errors remain visible and the participant can retry.
- A selection conflict closes the dialog, refreshes availability, and clears the team if another participant claimed it.

## Knockout Display

Knockout match cards keep the national-team name as the primary label. When a match slot contains an actual team and that team has an owner, the owner's display name appears as smaller secondary text below the team name.

Example:

```text
Argentina
အောင်ကျော်သူ
```

Placeholder slots such as `Group A winners` or `Winner Match 101` do not show a display name. No participant names are pre-populated into unresolved knockout slots.

The existing team payload already exposes `ownedByName`. `AppShell` passes team ownership data to `KnockoutTab`, which resolves a display name only for a concrete team code or exact team name.

## Error Handling

- Empty or whitespace-only name: show a required-field error.
- More than 80 characters: show a length error.
- Team selection conflict: refresh teams and show the existing conflict message.
- Other API failure: keep the dialog data available and show the existing save error.
- Cancelling never sends a request.

## Testing

- Selecting a team and pressing `Continue` opens the dialog.
- The input uses the placeholder `Display name`.
- Create mode requires a name before saving.
- Burmese input is submitted unchanged except for outer whitespace.
- Change mode prefills the current display name.
- Duplicate display names are accepted.
- Cancelling does not submit.
- Knockout cards show display names only for resolved, owned teams.
- Placeholder knockout slots never show display names.
- Existing selection conflict, mobile layout, session, lint, and production build checks continue to pass.
