# Knockout Status Filter Design

## Goal

Make the mobile knockout bracket feel like an unframed full-width surface and add a status filter above the round selector. `As it stands` shows the current projected bracket. `Confirmed` shows team names only for slots that the API marks as confirmed while preserving placeholders for every unresolved slot.

## UI

- Keep the existing mobile bracket DOM, swipe behavior, connectors, round selector, and cards.
- Remove the mobile bracket surface border, corner radius, and outer shadow so it no longer reads as one large card.
- Keep the black bracket background for contrast.
- Add a two-button segmented status control above the round selector: `As it stands` and `Confirmed`.
- Default to `As it stands` and use the existing light selected-pill treatment.
- Keep both status and round controls horizontally readable on mobile with 8px side spacing.

## Data Contract

Each knockout match may provide confirmation state and a fallback label independently for its home and away slots:

- `homeTeamConfirmed` / `awayTeamConfirmed`
- `homeTeamPlaceholder` / `awayTeamPlaceholder`

These fields are optional so existing API responses remain compatible. In `Confirmed` mode, a confirmed slot renders its team name. An unconfirmed slot renders its explicit placeholder, or `TBD` when no placeholder is supplied. `As it stands` continues to render the existing `homeTeam` and `awayTeam` values.

## State And Behavior

The selected status view is local UI state inside `KnockoutTab` and does not refetch data. Switching views changes only slot labels; bracket geometry, active round, horizontal position, vertical scroll position, scores, dates, and connectors remain stable.

## Testing

- Verify the status control defaults to `As it stands` and toggles to `Confirmed`.
- Verify confirmed slots keep their team names and unconfirmed slots show placeholders.
- Verify the unframed mobile surface styling while retaining the black background.
- Run the focused Knockout tests, full web test suite, type-check, and production build.

